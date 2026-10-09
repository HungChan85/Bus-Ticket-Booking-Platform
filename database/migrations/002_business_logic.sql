CREATE FUNCTION fn_get_available_seats(p_trip_id INTEGER) RETURNS INTEGER
LANGUAGE sql STABLE AS $$
    SELECT b.capacity - (
        SELECT count(*)::integer FROM ticket tk
        WHERE tk.trip_id = t.trip_id AND tk.ticket_status IN ('Issued', 'Used')
    ) FROM trip t JOIN bus b ON b.bus_id = t.bus_id WHERE t.trip_id = p_trip_id;
$$;

CREATE FUNCTION fn_calculate_booking_total(p_booking_id INTEGER) RETURNS INTEGER
LANGUAGE sql STABLE AS $$
    SELECT coalesce(sum(seat_price), 0)::integer FROM ticket
    WHERE booking_id = p_booking_id AND ticket_status NOT IN ('Cancelled', 'Refunded');
$$;

CREATE FUNCTION set_trip_arrival() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT NEW.service_date + (default_duration_time - TIME '00:00')
        INTO NEW.arrival_datetime FROM routetrip WHERE route_id = NEW.route_id;
    ELSIF NEW.service_date IS DISTINCT FROM OLD.service_date
       OR NEW.route_id IS DISTINCT FROM OLD.route_id THEN
        SELECT NEW.service_date + (default_duration_time - TIME '00:00')
        INTO NEW.arrival_datetime FROM routetrip WHERE route_id = NEW.route_id;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.trip_status = 'Cancelled' AND OLD.trip_status <> 'Cancelled'
       AND EXISTS (SELECT 1 FROM ticket WHERE trip_id = NEW.trip_id AND ticket_status = 'Issued') THEN
        RAISE EXCEPTION 'Cannot cancel trip: This trip has active tickets that must be refunded or rebooked first.';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_trip_arrival_and_cancellation BEFORE INSERT OR UPDATE ON trip
    FOR EACH ROW EXECUTE FUNCTION set_trip_arrival();

-- Functions return generated IDs; the caller owns the transaction.
CREATE FUNCTION sp_create_passenger_account(
    p_name TEXT, p_dob DATE, p_gov_id TEXT, p_email TEXT, p_phone TEXT, p_password TEXT
) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE v_account_id INTEGER; v_person_id INTEGER; v_passenger_id INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM account WHERE email = p_email OR phone = p_phone) THEN
        RAISE EXCEPTION 'Email or phone already exists for another account.';
    END IF;
    INSERT INTO account(email, phone, acc_password) VALUES (p_email, p_phone, p_password)
        RETURNING account_id INTO v_account_id;
    INSERT INTO person(person_name, date_of_birth, gov_id_num, account_id)
        VALUES (p_name, p_dob, nullif(p_gov_id, ''), v_account_id) RETURNING person_id INTO v_person_id;
    INSERT INTO passenger(person_id) VALUES (v_person_id) RETURNING passenger_id INTO v_passenger_id;
    RETURN v_passenger_id;
END;
$$;

CREATE FUNCTION sp_create_staff_account(
    p_name TEXT, p_dob DATE, p_gov_id TEXT, p_email TEXT, p_phone TEXT, p_password TEXT,
    p_hire_date DATE, p_operator_id TEXT
) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE v_account_id INTEGER; v_person_id INTEGER; v_staff_id INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM operator WHERE operator_id = p_operator_id) THEN
        RAISE EXCEPTION 'Operator does not exist.';
    END IF;
    IF EXISTS (SELECT 1 FROM account WHERE email = p_email OR phone = p_phone) THEN
        RAISE EXCEPTION 'Email or phone already exists for another account.';
    END IF;
    INSERT INTO account(email, phone, acc_password) VALUES (p_email, p_phone, p_password)
        RETURNING account_id INTO v_account_id;
    INSERT INTO person(person_name, date_of_birth, gov_id_num, account_id)
        VALUES (p_name, p_dob, nullif(p_gov_id, ''), v_account_id) RETURNING person_id INTO v_person_id;
    INSERT INTO staff(person_id, hire_date, operator_id) VALUES (v_person_id, p_hire_date, p_operator_id)
        RETURNING staff_id INTO v_staff_id;
    RETURN v_staff_id;
END;
$$;

CREATE FUNCTION sp_schedule_trip(p_service_date TIMESTAMP, p_bus_id INTEGER, p_route_id INTEGER)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE v_flag TEXT; v_trip_id INTEGER;
BEGIN
    SELECT bus_active_flag INTO v_flag FROM bus WHERE bus_id = p_bus_id;
    IF v_flag IS NULL THEN RAISE EXCEPTION 'Bus does not exist.'; END IF;
    IF v_flag <> 'Active' THEN RAISE EXCEPTION 'Bus is not active.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM routetrip WHERE route_id = p_route_id) THEN
        RAISE EXCEPTION 'Route does not exist.';
    END IF;
    INSERT INTO trip(service_date, bus_id, route_id) VALUES (p_service_date, p_bus_id, p_route_id)
        RETURNING trip_id INTO v_trip_id;
    RETURN v_trip_id;
END;
$$;

CREATE FUNCTION sp_create_booking_with_tickets(
    p_currency TEXT, p_account_id INTEGER, p_operator_id TEXT, p_trip_id INTEGER,
    p_fare_id INTEGER, p_seat_list JSONB, p_qr_code_link TEXT
) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE v_trip trip%ROWTYPE; v_fare fare%ROWTYPE; v_booking_id INTEGER;
        v_seat TEXT; v_capacity INTEGER; v_length INTEGER;
BEGIN
    -- Serialize bookings for this trip; the partial unique index is a second safeguard.
    SELECT * INTO v_trip FROM trip WHERE trip_id = p_trip_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Trip does not exist.'; END IF;
    IF v_trip.trip_status <> 'Scheduled' OR v_trip.service_date <= LOCALTIMESTAMP THEN
        RAISE EXCEPTION 'Trip is not available for booking.';
    END IF;
    SELECT * INTO v_fare FROM fare WHERE fare_id = p_fare_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Fare does not exist.'; END IF;
    IF v_fare.route_id <> v_trip.route_id THEN
        RAISE EXCEPTION 'Fare rule route does not match trip route.';
    END IF;
    IF v_trip.service_date::date NOT BETWEEN v_fare.valid_from AND v_fare.valid_to THEN
        RAISE EXCEPTION 'Fare is not valid for this trip date.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM routetrip WHERE route_id = v_trip.route_id AND operator_id = p_operator_id) THEN
        RAISE EXCEPTION 'Operator does not match trip route.';
    END IF;
    IF jsonb_typeof(p_seat_list) <> 'array' THEN
        RAISE EXCEPTION 'seat_list must be a non-empty array';
    END IF;
    v_length := jsonb_array_length(p_seat_list);
    IF v_length = 0 THEN RAISE EXCEPTION 'seat_list must be a non-empty array'; END IF;
    IF v_length <> (SELECT count(DISTINCT s) FROM jsonb_array_elements_text(p_seat_list) AS seats(s)) THEN
        RAISE EXCEPTION 'Duplicate seat codes';
    END IF;
    IF fn_get_available_seats(p_trip_id) < v_length THEN
        RAISE EXCEPTION 'Not enough available seats for this trip.';
    END IF;
    SELECT capacity INTO v_capacity FROM bus WHERE bus_id = v_trip.bus_id;
    INSERT INTO booking(currency, account_id, operator_id)
        VALUES (p_currency, p_account_id, p_operator_id) RETURNING booking_id INTO v_booking_id;
    FOR v_seat IN SELECT jsonb_array_elements_text(p_seat_list) LOOP
        IF v_seat IS NULL OR v_seat !~ '^[A-Za-z]?[0-9]+$' THEN
            RAISE EXCEPTION 'Invalid seat code: %', v_seat;
        END IF;
        IF regexp_replace(v_seat, '[^0-9]', '', 'g')::integer NOT BETWEEN 1 AND v_capacity THEN
            RAISE EXCEPTION 'Invalid seat code: %', v_seat;
        END IF;
        IF EXISTS (SELECT 1 FROM ticket WHERE trip_id = p_trip_id AND seat_code = v_seat
                   AND ticket_status IN ('Issued', 'Used')) THEN
            RAISE EXCEPTION 'Seat already taken: %', v_seat;
        END IF;
        INSERT INTO ticket(trip_id, account_id, booking_id, fare_id, qr_code_link, seat_price, seat_code)
            VALUES (p_trip_id, p_account_id, v_booking_id, p_fare_id, p_qr_code_link, v_fare.seat_price, v_seat);
    END LOOP;
    UPDATE booking SET total_amount = fn_calculate_booking_total(v_booking_id) WHERE booking_id = v_booking_id;
    RETURN v_booking_id;
END;
$$;

CREATE FUNCTION sp_refund_ticket(p_ticket_id INTEGER) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_ticket ticket%ROWTYPE;
BEGIN
    SELECT * INTO v_ticket FROM ticket WHERE ticket_id = p_ticket_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ticket does not exist.'; END IF;
    IF v_ticket.ticket_status <> 'Issued' THEN RAISE EXCEPTION 'Only issued tickets can be refunded.'; END IF;
    UPDATE ticket SET ticket_status = 'Refunded' WHERE ticket_id = p_ticket_id;
    UPDATE booking SET total_amount = fn_calculate_booking_total(v_ticket.booking_id)
        WHERE booking_id = v_ticket.booking_id;
END;
$$;
