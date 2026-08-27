
-- seed.sql
-- Dữ liệu khởi tạo cho hệ thống quản lý vé xe khách VietBus

USE defaultdb; 

-- =======================================================
-- 0. LÀM SẠCH DỮ LIỆU CŨ (RESET DATABASE)
-- =======================================================
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE ticket;
TRUNCATE TABLE booking;
TRUNCATE TABLE fare;
TRUNCATE TABLE trip;
TRUNCATE TABLE routetrip;
TRUNCATE TABLE haspoint;
TRUNCATE TABLE pickupdropoff;
TRUNCATE TABLE bus;
TRUNCATE TABLE station;
TRUNCATE TABLE staff;
TRUNCATE TABLE passenger;
TRUNCATE TABLE person;
TRUNCATE TABLE account;
TRUNCATE TABLE operator;
SET FOREIGN_KEY_CHECKS = 1;


-- =======================================================
-- 1. TẠO 3 NHÀ XE LỚN
-- =======================================================
INSERT INTO operator (operator_id, legal_name, brand_name, brand_email, tax_id) VALUES 
('', 'Cong ty CP Xe Khach Phuong Trang', 'FUTA Bus Lines', 'hotro@futabus.vn', 11001100),
('', 'Cong ty TNHH Thanh Buoi', 'Thanh Buoi', 'cskh@thanhbuoi.com.vn', 22002200),
('', 'Cong ty TNHH Van Tai Kumho', 'Kumho Samco', 'contact@kumhosamco.com', 33003300);
-- ID sẽ tự sinh là: OP001 (FUTA), OP002 (Thanh Bưởi), OP003 (Kumho)


-- =======================================================
-- 2. TẠO HỆ THỐNG TÀI KHOẢN (ADMIN, STAFF, USER)
-- =======================================================
INSERT INTO account (account_id, email, phone, stat, create_at, acc_password) VALUES 
(2, 'staff.futa@gmail.com', 900000002, 'Active', '2023-01-01', 'staff123'),
(3, 'staff.thanhbuoi@gmail.com', 900000003, 'Active', '2023-01-01', 'staff123'),
(4, 'nguyenvana@gmail.com', 918111222, 'Active', '2023-05-15', 'user123'),  -- Khách hàng VIP
(5, 'tranthib@gmail.com', 939444555, 'Active', '2023-06-20', 'user123');   -- Khách hàng Mới

INSERT INTO person (person_id, person_name, date_of_birth, gov_id_num, account_id) VALUES 
(1, 'Quan Tri Vien', '1990-01-01', 111111111, 1),
(2, 'NV Ban Ve FUTA', '1995-02-02', 222222222, 2),
(3, 'NV Ban Ve TB', '1996-03-03', 333333333, 3),
(4, 'Nguyen Van A', '1988-08-08', 444444444, 4),
(5, 'Tran Thi B', '2000-10-10', 555555555, 5);

-- Phân quyền
INSERT INTO staff (person_id, hire_date, operator_id) VALUES 
(2, '2021-01-01', 'OP001'), -- NV của FUTA
(3, '2021-05-01', 'OP002'); -- NV của Thanh Bưởi

INSERT INTO passenger (person_id) VALUES (4), (5);


-- =======================================================
-- 3. TẠO MẠNG LƯỚI BẾN XE (5 TỈNH THÀNH)
-- =======================================================
INSERT INTO station (station_id, city, active_flag, station_name, province, address_station, operator_id, latitude, longtitude) VALUES 
(1, 'Ho Chi Minh', 'Active', 'Ben Xe Mien Dong', 'HCM', '292 Dinh Bo Linh, Binh Thanh', 'OP001', 10.81, 106.70),
(2, 'Ho Chi Minh', 'Active', 'Ben Xe Mien Tay', 'HCM', '395 Kinh Duong Vuong, Binh Tan', 'OP001', 10.74, 106.61),
(3, 'Da Lat', 'Active', 'Ben Xe Lien Tinh Da Lat', 'Lam Dong', '01 To Hien Thanh', 'OP002', 11.93, 108.44),
(4, 'Can Tho', 'Active', 'Ben Xe Trung Tam Can Tho', 'Can Tho', 'Khu Do Thi Nam Can Tho', 'OP001', 10.01, 105.76),
(5, 'Vung Tau', 'Active', 'Ben Xe Vung Tau', 'Ba Ria - Vung Tau', 'Nam Ky Khoi Nghia', 'OP003', 10.35, 107.08),
(6, 'Nha Trang', 'Active', 'Ben Xe Phia Nam Nha Trang', 'Khanh Hoa', 'Vinh Trung, Nha Trang', 'OP001', 12.25, 109.18);


-- =======================================================
-- 4. TẠO ĐỘI XE (FLEET) - 10 CHIẾC
-- =======================================================
INSERT INTO bus (bus_id, plate_number, bus_active_flag, capacity, vehicle_type) VALUES 
-- Xe FUTA (Giường nằm & Limousine)
(101, '51B-100.01', 'Active', 40, 'Sleeper'),
(102, '51B-100.02', 'Active', 40, 'Sleeper'),
(103, '51B-100.99', 'Active', 22, 'Limousine'), -- VIP Cabin
-- Xe Thanh Bưởi (Giường nằm & Ghế ngồi)
(201, '49B-200.01', 'Active', 40, 'Sleeper'),
(202, '49B-200.02', 'Active', 45, 'Seater'),
-- Xe Kumho (Limousine & Ghế ngồi)
(301, '72B-300.01', 'Active', 22, 'Limousine'),
(302, '72B-300.02', 'Maintenance', 45, 'Seater'); -- Đang bảo trì


-- =======================================================
-- 5. TẠO TUYẾN ĐƯỜNG & GIÁ VÉ (ROUTES & FARES)
-- =======================================================
-- Route 1: HCM (Mien Dong) <-> Da Lat (FUTA)
INSERT INTO routetrip (route_id, default_duration_time, distance, station_id, arrival_station, operator_id) VALUES (1, '08:00:00', 305, 1, 3, 'OP001');
INSERT INTO fare (currency, route_id, seat_class, base_fare, seat_price, valid_from, valid_to) VALUES 
('VND', 1, 'Standard', 250000, 280000, '2023-01-01', '2025-12-31'), -- Vé thường 280k
('VND', 1, 'VIP', 350000, 450000, '2023-01-01', '2025-12-31');      -- Vé VIP 450k

-- Route 2: HCM (Mien Tay) <-> Can Tho (FUTA)
INSERT INTO routetrip (route_id, default_duration_time, distance, station_id, arrival_station, operator_id) VALUES (2, '04:00:00', 170, 2, 4, 'OP001');
INSERT INTO fare (currency, route_id, seat_class, base_fare, seat_price, valid_from, valid_to) VALUES 
('VND', 2, 'Standard', 140000, 165000, '2023-01-01', '2025-12-31');

-- Route 3: HCM (Mien Dong) <-> Vung Tau (Kumho)
INSERT INTO routetrip (route_id, default_duration_time, distance, station_id, arrival_station, operator_id) VALUES (3, '02:30:00', 100, 1, 5, 'OP003');
INSERT INTO fare (currency, route_id, seat_class, base_fare, seat_price, valid_from, valid_to) VALUES 
('VND', 3, 'VIP', 180000, 200000, '2023-01-01', '2025-12-31');

-- Route 4: HCM (Mien Dong) <-> Nha Trang (FUTA)
INSERT INTO routetrip (route_id, default_duration_time, distance, station_id, arrival_station, operator_id) VALUES (4, '09:00:00', 430, 1, 6, 'OP001');
INSERT INTO fare (currency, route_id, seat_class, base_fare, seat_price, valid_from, valid_to) VALUES 
('VND', 4, 'Standard', 300000, 320000, '2023-01-01', '2025-12-31');

-- Route 5: Da Lat <-> Nha Trang (Thanh Buoi)
INSERT INTO routetrip (route_id, default_duration_time, distance, station_id, arrival_station, operator_id) 
VALUES (5, '03:30:00', 135, 3, 6, 'OP002');
INSERT INTO fare (currency, route_id, seat_class, base_fare, seat_price, valid_from, valid_to) VALUES 
('VND', 5, 'Standard', 120000, 150000, '2023-01-01', '2025-12-31');

-- Route 6: Can Tho <-> Vung Tau (FUTA)
INSERT INTO routetrip (route_id, default_duration_time, distance, station_id, arrival_station, operator_id) 
VALUES (6, '05:00:00', 220, 4, 5, 'OP001');
INSERT INTO fare (currency, route_id, seat_class, base_fare, seat_price, valid_from, valid_to) VALUES 
('VND', 6, 'Standard', 180000, 210000, '2023-01-01', '2025-12-31');

-- Route 7: Nha Trang <-> Vung Tau (Kumho)
INSERT INTO routetrip (route_id, default_duration_time, distance, station_id, arrival_station, operator_id) 
VALUES (7, '07:00:00', 340, 6, 5, 'OP003');
INSERT INTO fare (currency, route_id, seat_class, base_fare, seat_price, valid_from, valid_to) VALUES 
('VND', 7, 'VIP', 280000, 350000, '2023-01-01', '2025-12-31');

-- Route 8: HCM (Mien Dong) <-> Can Tho (Thanh Buoi - tuyến cạnh tranh)
INSERT INTO routetrip (route_id, default_duration_time, distance, station_id, arrival_station, operator_id) 
VALUES (8, '04:30:00', 170, 1, 4, 'OP002');
INSERT INTO fare (currency, route_id, seat_class, base_fare, seat_price, valid_from, valid_to) VALUES 
('VND', 8, 'Economy', 110000, 140000, '2023-01-01', '2025-12-31');

-- Route 9: Da Lat <-> HCM Mien Tay (Chiều ngược lại)
INSERT INTO routetrip (route_id, default_duration_time, distance, station_id, arrival_station, operator_id) 
VALUES (9, '08:30:00', 310, 3, 2, 'OP001');
INSERT INTO fare (currency, route_id, seat_class, base_fare, seat_price, valid_from, valid_to) VALUES 
('VND', 9, 'Standard', 260000, 290000, '2023-01-01', '2025-12-31');


-- =======================================================
-- 6. TẠO LỊCH TRÌNH CHUYẾN XE ĐA DẠNG (40+ TRIPS)
-- =======================================================

-- --- HÔM QUA (Đã hoàn thành hoặc hủy) ---
INSERT INTO trip (trip_status, service_date, bus_id, route_id) VALUES 
-- Chuyến đi Đà Lạt
('Arrived', CONCAT(DATE(DATE_SUB(NOW(), INTERVAL 1 DAY)), ' 08:00:00'), 101, 1),
('Arrived', CONCAT(DATE(DATE_SUB(NOW(), INTERVAL 1 DAY)), ' 22:00:00'), 102, 1),
-- Chuyến đi Cần Thơ
('Arrived', CONCAT(DATE(DATE_SUB(NOW(), INTERVAL 1 DAY)), ' 06:00:00'), 101, 2),
('Arrived', CONCAT(DATE(DATE_SUB(NOW(), INTERVAL 1 DAY)), ' 14:00:00'), 201, 8),
-- Chuyến đi Vũng Tàu
('Arrived', CONCAT(DATE(DATE_SUB(NOW(), INTERVAL 1 DAY)), ' 09:00:00'), 301, 3),
-- Chuyến Đà Lạt - Nha Trang
('Arrived', CONCAT(DATE(DATE_SUB(NOW(), INTERVAL 1 DAY)), ' 11:00:00'), 201, 5),
-- Chuyến hủy do thời tiết xấu
('Cancelled', CONCAT(DATE(DATE_SUB(NOW(), INTERVAL 1 DAY)), ' 20:00:00'), 102, 4);

-- --- HÔM NAY (Đa dạng trạng thái: Departed/Scheduled) ---
INSERT INTO trip (trip_status, service_date, bus_id, route_id) VALUES 
-- Sáng sớm đã xuất bến (5-7h)
('Departed', CONCAT(DATE(NOW()), ' 05:00:00'), 101, 1),   -- HCM -> Đà Lạt
('Departed', CONCAT(DATE(NOW()), ' 06:30:00'), 201, 2),   -- HCM -> Cần Thơ
-- Đang chạy giờ cao điểm (8-10h)
('Departed', CONCAT(DATE(NOW()), ' 08:00:00'), 301, 3),   -- HCM -> Vũng Tàu
('Departed', CONCAT(DATE(NOW()), ' 09:30:00'), 201, 5),   -- Đà Lạt -> Nha Trang
-- Sắp chạy chiều nay (13-17h)
('Scheduled', CONCAT(DATE(NOW()), ' 13:00:00'), 102, 4),  -- HCM -> Nha Trang
('Scheduled', CONCAT(DATE(NOW()), ' 15:00:00'), 101, 8),  -- HCM -> Cần Thơ (Thanh Buoi)
('Scheduled', CONCAT(DATE(NOW()), ' 17:30:00'), 103, 1),  -- HCM -> Đà Lạt VIP
-- Chuyến đêm (21-23h)
('Scheduled', CONCAT(DATE(NOW()), ' 21:00:00'), 102, 1),  -- HCM -> Đà Lạt đêm
('Scheduled', CONCAT(DATE(NOW()), ' 22:00:00'), 201, 6),  -- Cần Thơ -> Vũng Tàu
('Scheduled', CONCAT(DATE(NOW()), ' 23:30:00'), 301, 7);  -- Nha Trang -> Vũng Tàu VIP

-- --- NGÀY MAI (Để khách đặt vé - 25 chuyến) ---
INSERT INTO trip (trip_status, service_date, bus_id, route_id) VALUES 
-- Sáng sớm khởi hành (5-7h)
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 05:30:00'), 101, 2),
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 06:00:00'), 201, 1),
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 07:00:00'), 301, 3),
-- Giờ vàng (7-10h - cao điểm đặt vé)
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 08:00:00'), 102, 4),
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 08:30:00'), 201, 5),
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 09:00:00'), 103, 1),  -- VIP Cabin
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 10:00:00'), 101, 8),
-- Trưa chiều (12-17h)
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 12:00:00'), 201, 2),
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 14:00:00'), 301, 6),
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 15:30:00'), 102, 9),
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 16:00:00'), 201, 5),
-- Tối đêm (19-23h)
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 19:00:00'), 101, 1),
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 20:00:00'), 103, 4),  -- VIP đi Nha Trang
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 21:30:00'), 201, 8),
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 22:00:00'), 301, 7),
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 23:00:00'), 102, 1),  -- Chuyến đêm cuối
-- Thêm các chuyến route khác
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 07:30:00'), 101, 2),
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 11:00:00'), 201, 3),
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 13:30:00'), 301, 4),
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 18:00:00'), 102, 2),
('Scheduled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 20:30:00'), 201, 1);

-- --- BỊ HỦY (Test giao diện hiển thị hủy) ---
INSERT INTO trip (trip_status, service_date, bus_id, route_id) VALUES 
('Cancelled', CONCAT(DATE(DATE_ADD(NOW(), INTERVAL 1 DAY)), ' 12:00:00'), 103, 1);


-- =======================================================
-- 7. TẠO BOOKING VÀ VÉ (Mô phỏng tình trạng ghế)
-- =======================================================

-- Kịch bản 1: Chuyến đi Đà Lạt đêm nay (Trip ID tự sinh, ta lấy tạm logic giả định)
-- Giả sử Trip ID 4 là chuyến đêm nay (dòng insert thứ 4 trong mục trip)
-- Khách A đặt 2 vé A01, A02
INSERT INTO booking (booking_id, currency, total_amount, account_id, operator_id, booking_status) VALUES 
(1, 'VND', 900000, 4, 'OP001', 'Active');

-- Lấy ID chuyến đêm nay (Trip VIP Limousine)
SET @trip_vip = (SELECT trip_id FROM trip WHERE bus_id = 103 AND trip_status = 'Scheduled' LIMIT 1);
SET @fare_vip = (SELECT fare_id FROM fare WHERE route_id = 1 AND seat_class = 'VIP' LIMIT 1);

INSERT INTO ticket (trip_id, account_id, booking_id, fare_id, ticket_status, seat_price, seat_code, serial_number) VALUES 
(@trip_vip, 4, 1, @fare_vip, 'Issued', 450000, 'A01', 12345678),
(@trip_vip, 4, 1, @fare_vip, 'Issued', 450000, 'A02', 12345679);


-- Kịch bản 2: Chuyến đi Vũng Tàu chiều nay (Sắp hết vé)
-- Khách B đặt 1 vé B05
INSERT INTO booking (booking_id, currency, total_amount, account_id, operator_id, booking_status) VALUES 
(2, 'VND', 200000, 5, 'OP003', 'Active');

SET @trip_vt = (SELECT trip_id FROM trip WHERE bus_id = 301 AND DATE(service_date) = DATE(NOW()) LIMIT 1);
SET @fare_vt = (SELECT fare_id FROM fare WHERE route_id = 3 LIMIT 1);

INSERT INTO ticket (trip_id, account_id, booking_id, fare_id, ticket_status, seat_price, seat_code, serial_number) VALUES 
(@trip_vt, 5, 2, @fare_vt, 'Issued', 200000, 'B05', 88888888);


-- Kịch bản 3: Chuyến đã bị hủy -> Vé phải được Refund
INSERT INTO booking (booking_id, currency, total_amount, account_id, operator_id, booking_status) VALUES 
(3, 'VND', 450000, 4, 'OP001', 'Cancelled');

SET @trip_cancel = (SELECT trip_id FROM trip WHERE trip_status = 'Cancelled' LIMIT 1);

INSERT INTO ticket (trip_id, account_id, booking_id, fare_id, ticket_status, seat_price, seat_code, serial_number) VALUES 
(@trip_cancel, 4, 3, @fare_vip, 'Refunded', 450000, 'A05', 77777777);


-- Kịch bản 4: Nhóm du lịch đặt 5 vé đi Nha Trang tối mai
INSERT INTO booking (booking_id, currency, total_amount, account_id, operator_id, booking_status) 
VALUES (4, 'VND', 1600000, 4, 'OP001', 'Active');

SET @trip_nt_tomorrow = (SELECT trip_id FROM trip 
    WHERE bus_id = 103 
    AND DATE(service_date) = DATE(DATE_ADD(NOW(), INTERVAL 1 DAY))
    AND TIME(service_date) = '20:00:00' LIMIT 1);
SET @fare_nt = (SELECT fare_id FROM fare WHERE route_id = 4 AND seat_class = 'Standard' LIMIT 1);

INSERT INTO ticket (trip_id, account_id, booking_id, fare_id, ticket_status, seat_price, seat_code, serial_number) VALUES 
(@trip_nt_tomorrow, 4, 4, @fare_nt, 'Issued', 320000, 'B01', 20001001),
(@trip_nt_tomorrow, 4, 4, @fare_nt, 'Issued', 320000, 'B02', 20001002),
(@trip_nt_tomorrow, 4, 4, @fare_nt, 'Issued', 320000, 'B03', 20001003),
(@trip_nt_tomorrow, 4, 4, @fare_nt, 'Issued', 320000, 'B04', 20001004),
(@trip_nt_tomorrow, 4, 4, @fare_nt, 'Issued', 320000, 'B05', 20001005);


-- Kịch bản 5: Vé đơn đi Cần Thơ sáng mai (Khách đi công tác)
INSERT INTO booking (booking_id, currency, total_amount, account_id, operator_id, booking_status) 
VALUES (5, 'VND', 165000, 5, 'OP001', 'Active');

SET @trip_ct_morning = (SELECT trip_id FROM trip 
    WHERE route_id = 2 
    AND DATE(service_date) = DATE(DATE_ADD(NOW(), INTERVAL 1 DAY))
    AND TIME(service_date) = '05:30:00' LIMIT 1);
SET @fare_ct = (SELECT fare_id FROM fare WHERE route_id = 2 LIMIT 1);

INSERT INTO ticket (trip_id, account_id, booking_id, fare_id, ticket_status, seat_price, seat_code, serial_number) VALUES 
(@trip_ct_morning, 5, 5, @fare_ct, 'Issued', 165000, 'A10', 30001001);


-- Kịch bản 6: Khách đặt vé nhưng hủy sau (Refund)
INSERT INTO booking (booking_id, currency, total_amount, account_id, operator_id, booking_status) 
VALUES (6, 'VND', 0, 4, 'OP002', 'Cancelled');

SET @trip_dl_afternoon = (SELECT trip_id FROM trip 
    WHERE route_id = 1 
    AND DATE(service_date) = DATE(DATE_ADD(NOW(), INTERVAL 1 DAY))
    AND TIME(service_date) = '20:30:00' LIMIT 1);
SET @fare_dl_std = (SELECT fare_id FROM fare WHERE route_id = 1 AND seat_class = 'Standard' LIMIT 1);

INSERT INTO ticket (trip_id, account_id, booking_id, fare_id, ticket_status, seat_price, seat_code, serial_number) VALUES 
(@trip_dl_afternoon, 4, 6, @fare_dl_std, 'Refunded', 280000, 'C15', 40001001);


-- Kịch bản 7: Vé đã sử dụng (chuyến hôm qua)
INSERT INTO booking (booking_id, currency, total_amount, account_id, operator_id, booking_status) 
VALUES (7, 'VND', 150000, 5, 'OP002', 'Completed');

SET @trip_yesterday_dl_nt = (SELECT trip_id FROM trip 
    WHERE route_id = 5 
    AND DATE(service_date) = DATE(DATE_SUB(NOW(), INTERVAL 1 DAY)) LIMIT 1);
SET @fare_dl_nt = (SELECT fare_id FROM fare WHERE route_id = 5 LIMIT 1);

INSERT INTO ticket (trip_id, account_id, booking_id, fare_id, ticket_status, seat_price, seat_code, serial_number) VALUES 
(@trip_yesterday_dl_nt, 5, 7, @fare_dl_nt, 'Used', 150000, 'D08', 50001001);


-- =======================================================
-- KIỂM TRA KẾT QUẢ VÀ THỐNG KÊ
-- =======================================================
SELECT '--- TỔNG QUAN HỆ THỐNG ---' AS Info;
SELECT 
    (SELECT COUNT(*) FROM operator) AS 'Tổng nhà xe',
    (SELECT COUNT(*) FROM routetrip) AS 'Tổng tuyến đường',
    (SELECT COUNT(*) FROM trip) AS 'Tổng chuyến xe',
    (SELECT COUNT(*) FROM booking) AS 'Tổng booking',
    (SELECT COUNT(*) FROM ticket) AS 'Tổng vé đã phát hành';

SELECT '--- TOP 5 TUYẾN HOT NHẤT (Theo số vé) ---' AS Info;
SELECT r.route_id, s1.city AS 'From', s2.city AS 'To', COUNT(t.ticket_id) AS 'Số vé'
FROM ticket t
JOIN trip tr ON t.trip_id = tr.trip_id
JOIN routetrip r ON tr.route_id = r.route_id
JOIN station s1 ON r.station_id = s1.station_id
JOIN station s2 ON r.arrival_station = s2.station_id
GROUP BY r.route_id
ORDER BY COUNT(t.ticket_id) DESC LIMIT 5;

SELECT '--- DANH SÁCH CHUYẾN XE NGÀY MAI ---' AS Info;
SELECT t.trip_id, t.service_date, t.trip_status, b.vehicle_type, s1.city as 'From', s2.city as 'To', f.seat_price
FROM trip t
JOIN bus b ON t.bus_id = b.bus_id
JOIN routetrip r ON t.route_id = r.route_id
JOIN station s1 ON r.station_id = s1.station_id
JOIN station s2 ON r.arrival_station = s2.station_id
JOIN fare f ON f.route_id = r.route_id
WHERE DATE(t.service_date) = DATE(DATE_ADD(NOW(), INTERVAL 1 DAY))
ORDER BY t.service_date;
