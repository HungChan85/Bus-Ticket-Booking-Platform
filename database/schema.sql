DROP DATABASE IF EXISTS defaultdb;
CREATE DATABASE defaultdb;
USE defaultdb;

CREATE TABLE operator (
    operator_id VARCHAR(10) PRIMARY KEY,
    legal_name VARCHAR(256) UNIQUE NOT NULL,
    brand_name VARCHAR(256) UNIQUE NOT NULL,
    brand_email VARCHAR(256) UNIQUE NOT NULL,
    tax_id INT UNIQUE NOT NULL
);

DELIMITER $$

DROP TRIGGER IF EXISTS trg_operator_before_insert$$
CREATE TRIGGER trg_operator_before_insert
BEFORE INSERT ON operator
FOR EACH ROW
BEGIN
    DECLARE max_num INT;

    -- Extract numeric part of operator_id, find the highest number
    SELECT COALESCE(MAX(CAST(SUBSTRING(operator_id, 3) AS UNSIGNED)), 0)
    INTO max_num
    FROM operator;

    -- Assign new ID with prefix OP
    SET NEW.operator_id = CONCAT('OP', LPAD(max_num + 1, 3, '0'));
END$$

DELIMITER ;

CREATE TABLE account (
    account_id INT AUTO_INCREMENT,
    email VARCHAR(256) NOT NULL,
    phone INT NOT NULL,
    stat VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (stat IN ('Active', 'Inactive', 'Suspended', 'Deleted')),
    create_at date NOT NULL,
    acc_password VARCHAR(256) NOT NULL,
    CONSTRAINT acc_id PRIMARY KEY (account_id)
);

CREATE TABLE person (
    person_id INT AUTO_INCREMENT,
    person_name VARCHAR(256) NOT NULL,
    date_of_birth date NOT NULL,
    gov_id_num INT UNIQUE,
    account_id INT UNIQUE NOT NULL,
    CONSTRAINT pk_person PRIMARY KEY (person_id),
    CONSTRAINT acc_id_pk FOREIGN KEY (account_id) REFERENCES account(account_id) ON DELETE CASCADE
);

CREATE TABLE staff (
    staff_id INT AUTO_INCREMENT,
    person_id INT,
    hire_date date NOT NULL,
    operator_id VARCHAR(10) NOT NULL,
    CONSTRAINT pk_staff PRIMARY KEY (staff_id),
    CONSTRAINT staff_op_fk FOREIGN KEY (operator_id) REFERENCES operator(operator_id) ON DELETE CASCADE,
    CONSTRAINT staff_person_fk FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE
);

CREATE TABLE passenger (
    passenger_id INT AUTO_INCREMENT,
    person_id INT NOT NULL,
    CONSTRAINT pk_passenger PRIMARY KEY (passenger_id),
    CONSTRAINT person_passenger_fk FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE
);

CREATE TABLE station (
    station_id INT AUTO_INCREMENT,
    city VARCHAR(256) NOT NULL,
    active_flag VARCHAR(256) DEFAULT 'Active' CHECK (active_flag IN ('Active', 'Inactive', 'Maintenance')),
    station_name VARCHAR(256) UNIQUE NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longtitude DECIMAL(9,6) NOT NULL,
    province VARCHAR(256) NOT NULL,
    address_station VARCHAR(256) NOT NULL,
    operator_id VARCHAR(10) NOT NULL,
    CONSTRAINT station_pk PRIMARY KEY (station_id),
    CONSTRAINT station_operator_fk FOREIGN KEY (operator_id) REFERENCES operator(operator_id) ON DELETE CASCADE
);

CREATE TABLE pickupdropoff (
    point_id INT AUTO_INCREMENT,
    trans_type VARCHAR(20) NOT NULL CHECK (trans_type IN ('Pick Up', 'Drop Off','Both')),
    CONSTRAINT point_pk PRIMARY KEY (point_id)
);

CREATE TABLE haspoint (
    station_id INT NOT NULL,
    point_id INT NOT NULL,
    CONSTRAINT haspoin_pk PRIMARY KEY (station_id, point_id),
    CONSTRAINT haspoint_station_fk FOREIGN KEY (station_id) REFERENCES station(station_id) ON DELETE CASCADE,
    CONSTRAINT haspoint_point_fk FOREIGN KEY (point_id) REFERENCES pickupdropoff(point_id) ON DELETE CASCADE
);

CREATE TABLE bus (
    bus_id INT AUTO_INCREMENT,
    plate_number VARCHAR(256) UNIQUE NOT NULL,
    bus_active_flag VARCHAR(256),
    capacity INT,
    vehicle_type VARCHAR(256) CHECK (vehicle_type IN ('Sleeper','Seater', 'Limousine')),
    CONSTRAINT bus_pk PRIMARY KEY (bus_id)
);

CREATE TABLE routetrip (
    route_id INT AUTO_INCREMENT,
    default_duration_time TIME,
    distance INT,
    station_id INT,
    arrival_station INT,
    operator_id VARCHAR(10),
    CONSTRAINT route_pk PRIMARY KEY (route_id),
    CONSTRAINT route_station_fk FOREIGN KEY (station_id) REFERENCES station(station_id) ON DELETE CASCADE,
    CONSTRAINT route_operator_fk FOREIGN KEY (operator_id) REFERENCES operator(operator_id) ON DELETE CASCADE
);

CREATE TABLE trip (
    trip_id INT AUTO_INCREMENT,
    trip_status VARCHAR(256) NOT NULL CHECK (trip_status IN ('Scheduled', 'Departed', 'Arrived', 'Cancelled')),
    service_date DATETIME NOT NULL,
    -- khai báo thiếu
    -- THÊM DÒNG NÀY VÀO
    arrival_datetime DATETIME, 
    -- -----------------------
    bus_id INT,
    route_id INT,
    CONSTRAINT trip_pk PRIMARY KEY (trip_id),
    CONSTRAINT trip_bus_fk FOREIGN KEY (bus_id) REFERENCES bus(bus_id) ON DELETE CASCADE,
    CONSTRAINT route_trip_fk FOREIGN KEY (route_id) REFERENCES routetrip(route_id) ON DELETE CASCADE
);

CREATE TABLE fare (
    fare_id INT AUTO_INCREMENT,
    currency VARCHAR(20),
    discount FLOAT,
    valid_from date,
    valid_to date,
    taxes FLOAT,
    route_id INT,
    surcharges INT,
    base_fare INT,
    seat_price INT,
    seat_class VARCHAR(20) NOT NULL CHECK (seat_class IN ('VIP', 'Standard', 'Economy')),
    CONSTRAINT fare_pk PRIMARY KEY (fare_id),
    CONSTRAINT fare_route_fk FOREIGN KEY (route_id) REFERENCES routetrip(route_id) ON DELETE CASCADE
);

CREATE TABLE booking (
    booking_id INT AUTO_INCREMENT,
    currency VARCHAR(20) NOT NULL,
    total_amount INT,
    account_id INT,
    operator_id VARCHAR(10),
    booking_status VARCHAR(20) NOT NULL DEFAULT 'Active'
    CHECK (booking_status IN ('Active','Cancelled','Completed')),
    admin_note VARCHAR(512),

    CONSTRAINT booking_pk PRIMARY KEY (booking_id),
    CONSTRAINT booking_account_fk FOREIGN KEY (account_id) REFERENCES account(account_id) ON DELETE CASCADE,
    CONSTRAINT booking_operator_fk FOREIGN KEY (operator_id) REFERENCES operator(operator_id) ON DELETE CASCADE
);

CREATE TABLE ticket (
    ticket_id INT AUTO_INCREMENT,
    trip_id INT,
    account_id INT,
    booking_id INT,
    fare_id INT,
    qr_code_link VARCHAR(256),
    ticket_status VARCHAR(256) CHECK (ticket_status IN ('Used','Issued','Refunded','Cancelled')),
    seat_price INT,
    seat_code VARCHAR(10),
    serial_number INT,
    CONSTRAINT ticket_pk PRIMARY KEY (ticket_id),
    CONSTRAINT book_trip_fk FOREIGN KEY (trip_id) REFERENCES trip(trip_id) ON DELETE CASCADE,
    CONSTRAINT book_account_fk FOREIGN KEY (account_id) REFERENCES account(account_id) ON DELETE CASCADE,
    CONSTRAINT book_booking_fk FOREIGN KEY (booking_id) REFERENCES booking(booking_id) ON DELETE CASCADE,
    CONSTRAINT book_fare_fk FOREIGN KEY (fare_id) REFERENCES fare(fare_id) ON DELETE CASCADE,
    CONSTRAINT uq_ticket_trip_seat UNIQUE (trip_id, seat_code)
);

DELIMITER $$

-- Function 1: Get Available Seats for a Trip
DROP FUNCTION IF EXISTS fn_get_available_seats$$
CREATE FUNCTION fn_get_available_seats(
    p_trip_id INT
)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE total_capacity INT;
    DECLARE seats_booked INT;

    SELECT b.capacity INTO total_capacity
    FROM trip t
    JOIN bus b ON t.bus_id = b.bus_id
    WHERE t.trip_id = p_trip_id;

    SELECT COUNT(ticket_id) INTO seats_booked
    FROM ticket
    WHERE trip_id = p_trip_id 
      AND ticket_status IN ('Used', 'Issued');

    RETURN (total_capacity - seats_booked);
END$$

-- Function 2: Calculate Booking Total
DROP FUNCTION IF EXISTS fn_calculate_booking_total$$
CREATE FUNCTION fn_calculate_booking_total(
    p_booking_id INT
)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE total_amount INT;

    SELECT SUM(seat_price) INTO total_amount
    FROM ticket
    WHERE booking_id = p_booking_id
      AND ticket_status NOT IN ('Cancelled', 'Refunded');

    RETURN total_amount;
END$$

-- Stored Procedure 1: Find Departing Trips from a Station
DROP PROCEDURE IF EXISTS sp_find_trips_from_station$$
CREATE PROCEDURE sp_find_trips_from_station(
    IN p_station_id INT,
    IN p_service_date DATE
)
BEGIN
    SELECT 
        t.trip_id,
        t.service_date,
        t.trip_status,
        rt.default_duration_time,
        rt.distance
    FROM trip AS t
    JOIN routetrip AS rt ON t.route_id = rt.route_id
    WHERE 
        rt.station_id = p_station_id
        AND DATE(t.service_date) = p_service_date
        AND t.trip_status = 'Scheduled'
    ORDER BY t.service_date ASC;
END$$

-- Stored Procedure 2: Get Operator Revenue Report
DROP PROCEDURE IF EXISTS sp_get_operator_revenue$$
CREATE PROCEDURE sp_get_operator_revenue(
    IN p_operator_id VARCHAR(10),
    IN p_start_date DATE,
    IN p_end_date DATE

)
BEGIN
    IF p_start_date > p_end_date THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Start date cannot be after end date.';
    ELSE
        SELECT 
            t.route_id,
            SUM(b.total_amount) AS total_revenue
        FROM booking AS b
        JOIN ticket AS tk ON b.booking_id = tk.booking_id
        JOIN trip AS t ON tk.trip_id = t.trip_id
        WHERE
            b.operator_id = p_operator_id
            AND DATE(t.service_date) BETWEEN p_start_date AND p_end_date
        GROUP BY t.route_id
        HAVING total_revenue > 0;
    END IF;
END$$

DELIMITER $$

-- Trigger 1: Generate a Derived Column Value
DROP TRIGGER IF EXISTS trg_ticket_before_insert_generate_serial$$
CREATE TRIGGER trg_ticket_before_insert_generate_serial
BEFORE INSERT ON ticket
FOR EACH ROW
BEGIN
    SET NEW.serial_number = FLOOR(10000000 + (RAND() * 90000000));
END$$

-- Trigger 2: Enforce a Meaningful Business Rule
DROP TRIGGER IF EXISTS trg_trip_before_update_check_tickets$$
CREATE TRIGGER trg_trip_before_update_check_tickets
BEFORE UPDATE ON trip
FOR EACH ROW
BEGIN
    DECLARE active_tickets INT;

    IF NEW.trip_status = 'Cancelled' AND OLD.trip_status != 'Cancelled' THEN
        SELECT COUNT(*) INTO active_tickets
        FROM ticket
        WHERE trip_id = NEW.trip_id AND ticket_status = 'Issued';
        
        IF active_tickets > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot cancel trip: This trip has active tickets that must be refunded or rebooked first.';
        END IF;
    END IF;
END$$

DELIMITER ;


-- Trigger 3: Tự động tính arrival_datetime khi có service_date dựa trên default duration
DELIMITER $$

DROP TRIGGER IF EXISTS trg_trip_before_insert_set_arrival$$
CREATE TRIGGER trg_trip_before_insert_set_arrival
BEFORE INSERT ON trip
FOR EACH ROW
BEGIN
    DECLARE v_duration TIME;

    SELECT default_duration_time
    INTO v_duration
    FROM routetrip
    WHERE route_id = NEW.route_id;

    IF v_duration IS NOT NULL THEN
        SET NEW.arrival_datetime = ADDTIME(NEW.service_date, v_duration);
    END IF;
END$$

DELIMITER ;

-- Trigger 4 tự động cập nhật lại thời lượng của trip trong routetrip 
-- khi thay đổi route id hoặc giờ khởi hành để tính lại giờ đến ước tính 
DELIMITER $$

DROP TRIGGER IF EXISTS trg_trip_before_update_set_arrival$$
CREATE TRIGGER trg_trip_before_update_set_arrival
BEFORE UPDATE ON trip
FOR EACH ROW
BEGIN
    DECLARE v_duration TIME;

    IF NEW.service_date <> OLD.service_date
       OR NEW.route_id <> OLD.route_id THEN

        SELECT default_duration_time
        INTO v_duration
        FROM routetrip
        WHERE route_id = NEW.route_id;

        SET NEW.arrival_datetime = ADDTIME(NEW.service_date, v_duration);
    END IF;
END$$

DELIMITER ;


/* =========================================================
   1. TẠO ACCOUNT + PERSON + PASSENGER (ĐĂNG KÝ KHÁCH)
   - Tạo account (email/phone unique)
   - Tạo person
   - Tạo passenger
   ========================================================= */
DROP PROCEDURE IF EXISTS sp_create_passenger_account;
DELIMITER $$

CREATE PROCEDURE sp_create_passenger_account (
    IN  p_name        VARCHAR(256),
    IN  p_dob         DATE,
    IN  p_gov_id      VARCHAR(50),
    IN  p_email       VARCHAR(256),
    IN  p_phone       VARCHAR(20),
    IN  p_password    VARCHAR(256),
    OUT o_passenger_id INT
)
BEGIN
    DECLARE v_account_id INT;
    DECLARE v_person_id  INT;
    DECLARE v_exists     INT;

    SELECT COUNT(*) INTO v_exists
    FROM account
    WHERE email = p_email OR phone = p_phone;

    IF v_exists > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Email or phone already exists for another account.';
    END IF;

    START TRANSACTION;

    INSERT INTO account (email, phone, stat, create_at, acc_password)
    VALUES (p_email, p_phone, 'Active', NOW(), p_password);
    SET v_account_id = LAST_INSERT_ID();

    INSERT INTO person (person_name, date_of_birth, gov_id_num, account_id)
    VALUES (p_name, p_dob, p_gov_id, v_account_id);
    SET v_person_id = LAST_INSERT_ID();

    INSERT INTO passenger (person_id)
    VALUES (v_person_id);
    SET o_passenger_id = LAST_INSERT_ID();

    COMMIT;
END$$
DELIMITER ;




/* =========================================================
   2. TẠO ACCOUNT + PERSON + STAFF (ĐĂNG KÝ NHÂN VIÊN)
   - Check operator tồn tại
   - Email / phone unique
   - Tạo account, person, staff
   ========================================================= */
DROP PROCEDURE IF EXISTS sp_create_staff_account;
DELIMITER $$

CREATE PROCEDURE sp_create_staff_account (
    IN  p_name         VARCHAR(256),
    IN  p_dob          DATE,
    IN  p_gov_id       VARCHAR(50),
    IN  p_email        VARCHAR(256),
    IN  p_phone        VARCHAR(20),
    IN  p_password     VARCHAR(256),
    IN  p_hire_date    DATE,
    IN  p_operator_id  VARCHAR(10),
    OUT o_staff_id     INT
)
BEGIN
    DECLARE v_account_id INT;
    DECLARE v_person_id  INT;
    DECLARE v_exists     INT;
    DECLARE v_op_exists  INT;

    SELECT COUNT(*) INTO v_op_exists
    FROM operator
    WHERE operator_id = p_operator_id;

    IF v_op_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Operator does not exist.';
    END IF;

    SELECT COUNT(*) INTO v_exists
    FROM account
    WHERE email = p_email OR phone = p_phone;

    IF v_exists > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Email or phone already exists for another account.';
    END IF;

    START TRANSACTION;

    INSERT INTO account (email, phone, stat, create_at, acc_password)
    VALUES (p_email, p_phone, 'Active', NOW(), p_password);
    SET v_account_id = LAST_INSERT_ID();

    INSERT INTO person (person_name, date_of_birth, gov_id_num, account_id)
    VALUES (p_name, p_dob, p_gov_id, v_account_id);
    SET v_person_id = LAST_INSERT_ID();

    INSERT INTO staff (person_id, hire_date, operator_id)
    VALUES (v_person_id, p_hire_date, p_operator_id);
    SET o_staff_id = LAST_INSERT_ID();

    COMMIT;
END$$
DELIMITER ;

/* =========================================================
   3. LÊN LỊCH TRIP MỚI (SCHEDULE TRIP)
   - Chỉ cho dùng bus có bus_active_flag = 'Active'
   - Check route tồn tại
   ========================================================= */
-- Thêm delimiter
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_schedule_trip$$
CREATE PROCEDURE sp_schedule_trip (
    IN  p_service_date DATETIME,
    IN  p_bus_id       INT,
    IN  p_route_id     INT,
    OUT o_trip_id      INT
)
BEGIN
    DECLARE v_flag      VARCHAR(256);
    DECLARE v_route_cnt INT;

    -- Check bus
    SELECT bus_active_flag INTO v_flag
    FROM bus
    WHERE bus_id = p_bus_id;

    IF v_flag IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Bus does not exist.';
    ELSEIF v_flag <> 'Active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Bus is not active.';
    END IF;

    -- Check route
    SELECT COUNT(*) INTO v_route_cnt
    FROM routetrip
    WHERE route_id = p_route_id;

    IF v_route_cnt = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Route does not exist.';
    END IF;

    -- Insert trip
    INSERT INTO trip (
        trip_status,
        service_date,
        bus_id,
        route_id
    )
    VALUES (
        'Scheduled',
        p_service_date,
        p_bus_id,
        p_route_id
    );

    SET o_trip_id = LAST_INSERT_ID();
END$$
-- Đóng delimiter
DELIMITER ;



/* =========================================================
   4. TẠO BOOKING + 1 TICKET (ISSUE TICKET)
   - Check còn ghế (fn_get_available_seats)
   - Check seat_code chưa bị dùng trên trip đó
   - Check Fare Rule Route Match (fare.route_id = trip.route_id)
   - Tạo booking, ticket, cập nhật total_amount (fn_calculate_booking_total)
   ========================================================= */
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_create_booking_with_tickets$$
CREATE PROCEDURE sp_create_booking_with_tickets (
    IN  p_currency      VARCHAR(20),
    IN  p_account_id    INT,
    IN  p_operator_id   VARCHAR(10),
    IN  p_trip_id       INT,
    IN  p_fare_id       INT,
    IN  p_seat_list     JSON,          -- VD: '["1","2","3"]'
    IN  p_qr_code_link  VARCHAR(256),  -- có thể để NULL, cùng link cho tất cả vé
    OUT o_booking_id    INT
)
BEGIN
    DECLARE v_available_seats INT;
    DECLARE v_trip_route      INT;
    DECLARE v_fare_route      INT;
    DECLARE v_seat_price      INT;

    DECLARE v_len        INT;
    DECLARE v_index      INT DEFAULT 0;
    DECLARE v_seat_code  VARCHAR(10);
    DECLARE v_seat_exists INT;

    -- KHAI BÁO THÊM BIẾN ĐỂ CHỨA THÔNG BÁO LỖI
    DECLARE v_msg        VARCHAR(255);

    -- 1. Kiểm tra trip tồn tại + lấy route_id
    SELECT route_id INTO v_trip_route
    FROM trip
    WHERE trip_id = p_trip_id;

    IF v_trip_route IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Trip does not exist.';
    END IF;

    -- 2. Kiểm tra fare tồn tại + lấy route_id & seat_price
    SELECT route_id, seat_price INTO v_fare_route, v_seat_price
    FROM fare
    WHERE fare_id = p_fare_id;

    IF v_fare_route IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Fare rule does not exist.';
    END IF;

    -- 3. Check route match
    IF v_trip_route <> v_fare_route THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Fare rule route does not match trip route.';
    END IF;

    -- 4. Kiểm tra còn đủ ghế
    SET v_available_seats = fn_get_available_seats(p_trip_id);
    SET v_len = JSON_LENGTH(p_seat_list);  -- số ghế muốn đặt

    IF v_available_seats < v_len THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Not enough available seats for this trip.';
    END IF;

    START TRANSACTION;

    -- 5. Tạo booking (total_amount tạm = 0)
    INSERT INTO booking (currency, total_amount, account_id, operator_id)
    VALUES (p_currency, 0, p_account_id, p_operator_id);
    SET o_booking_id = LAST_INSERT_ID();

    -- 6. Lặp qua danh sách ghế
    seat_loop: LOOP
        IF v_index >= v_len THEN
            LEAVE seat_loop;
        END IF;

        -- Lấy seat_code thứ v_index từ JSON array (VARCHAR)
        SET v_seat_code = JSON_UNQUOTE(JSON_EXTRACT(p_seat_list, CONCAT('$[', v_index, ']')));

        -- Kiểm tra ghế đã được dùng trên trip này chưa
        SELECT COUNT(*) INTO v_seat_exists
        FROM ticket
        WHERE trip_id = p_trip_id
          AND seat_code = v_seat_code
          AND ticket_status IN ('Issued', 'Used');

        IF v_seat_exists > 0 THEN
            -- ---SỬA CHỖ NÀY ---
            -- Tính toán chuỗi lỗi ra biến trước
            SET v_msg = CONCAT('Seat already taken: ', v_seat_code);
            -- Sau đó mới dùng trong SIGNAL
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
        END IF;

        -- Tạo ticket cho ghế này
        INSERT INTO ticket (
            trip_id,
            account_id,
            booking_id,
            fare_id,
            qr_code_link,
            ticket_status,
            seat_price,
            seat_code
        )
        VALUES (
            p_trip_id,
            p_account_id,
            o_booking_id,
            p_fare_id,
            p_qr_code_link,
            'Issued',
            v_seat_price,
            v_seat_code
        );

        SET v_index = v_index + 1;
    END LOOP;

    -- 7. Cập nhật tổng tiền booking bằng function
    UPDATE booking
    SET total_amount = fn_calculate_booking_total(o_booking_id)
    WHERE booking_id = o_booking_id;

    COMMIT;
END$$

DELIMITER ;





/* =========================================================
   5. THÊM FARE RULE MỚI (GIÁ VÉ)
   - Check valid_from < valid_to
   - Check không overlap với fare khác cùng route_id
   ========================================================= */
-- Thêm delimiter
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_add_fare_rule$$
CREATE PROCEDURE sp_add_fare_rule (
    IN  p_currency    VARCHAR(20),
    IN  p_discount    FLOAT,
    IN  p_valid_from  date,
    IN  p_valid_to    date,
    IN  p_taxes       FLOAT,
    IN  p_route_id    INT,
    IN  p_surcharges  INT,
    IN  p_base_fare   INT,
    IN  p_seat_price  INT,
    IN  p_seat_class  VARCHAR(20),
    OUT o_fare_id     INT
)
BEGIN
    DECLARE v_route_cnt  INT;
    DECLARE v_overlap_cnt INT;

    -- Check thời gian hợp lệ
    IF p_valid_from >= p_valid_to THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'valid_from must be before valid_to.';
    END IF;

    -- Check route tồn tại
    SELECT COUNT(*) INTO v_route_cnt
    FROM routetrip
    WHERE route_id = p_route_id;

    IF v_route_cnt = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Route does not exist.';
    END IF;

    -- Check không overlap với fare khác cùng route
    -- Overlap nếu: NOT (new_to <= old_from OR new_from >= old_to)
    SELECT COUNT(*) INTO v_overlap_cnt
    FROM fare
    WHERE route_id = p_route_id
      AND NOT (p_valid_to <= valid_from OR p_valid_from >= valid_to);

    IF v_overlap_cnt > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'New fare rule validity period overlaps with an existing rule for this route.';
    END IF;

    -- Insert fare
    INSERT INTO fare (currency, discount, valid_from, valid_to, taxes,
                      route_id, surcharges, base_fare, seat_price, seat_class)
    VALUES (p_currency, p_discount, p_valid_from, p_valid_to, p_taxes,
            p_route_id, p_surcharges, p_base_fare, p_seat_price, p_seat_class);

    SET o_fare_id = LAST_INSERT_ID();
END$$

DELIMITER ;

-- thêm logic chỉnh status của trip mỗi phút
-- SET GLOBAL event_scheduler = ON;
DELIMITER $$
DROP EVENT IF EXISTS ev_auto_update_trip_status$$
CREATE EVENT ev_auto_update_trip_status
ON SCHEDULE EVERY 1 MINUTE
DO
BEGIN
    UPDATE trip
    SET trip_status = CASE
        WHEN NOW() < service_date THEN 'Scheduled'
        WHEN NOW() >= service_date AND NOW() < arrival_datetime THEN 'Departed'
        WHEN NOW() >= arrival_datetime THEN 'Arrived'
        ELSE trip_status
    END
    WHERE trip_status != 'Cancelled';
END$$

DELIMITER ;