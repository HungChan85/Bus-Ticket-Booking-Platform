import React, { useState } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { apiUrl } from '../utils/api';
import '../App.css';

export default function TicketLookup() {
    const [formData, setFormData] = useState({
        phone: '',
        serial_number: ''
    });
    const [errors, setErrors] = useState({});
    const [ticketInfo, setTicketInfo] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [notFound, setNotFound] = useState(false);

    // Validate form data
    const validateForm = () => {
        const newErrors = {};

        // Validate phone number (10 digits)
        const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
        if (!formData.phone || !phoneRegex.test(formData.phone)) {
            newErrors.phone = "Số điện thoại không hợp lệ (phải có 10 chữ số)";
        }

        // Validate serial number (must be provided)
        if (!formData.serial_number || formData.serial_number.trim() === '') {
            newErrors.serial_number = "Vui lòng nhập mã vé";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear error when user starts typing
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: '' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setNotFound(false);
        setTicketInfo(null);

        if (validateForm()) {
            try {
                // Call the actual API endpoint
                const API_URL = apiUrl('/api/tickets/lookup');

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        serial_number: formData.serial_number,
                        phone: formData.phone
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    setTicketInfo(data.data);
                    setShowModal(true);
                } else {
                    setNotFound(true);
                }
            } catch (error) {
                console.error('Error fetching ticket:', error);
                setNotFound(true);
            }
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setTicketInfo(null);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            <Header />
            <div className="ticket-lookup-page">
                <div className="ticket-lookup-container">
                    <h2 className="ticket-lookup-title">TRA CỨU THÔNG TIN ĐẶT VÉ</h2>

                    <form onSubmit={handleSubmit} className="ticket-lookup-form">
                        <div className="form-group">
                            <label>Số điện thoại</label>
                            <input
                                name="phone"
                                type="text"
                                placeholder="Vui lòng nhập số điện thoại"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                            {errors.phone && <span className="error">{errors.phone}</span>}
                        </div>

                        <div className="form-group">
                            <label>Mã vé</label>
                            <input
                                name="serial_number"
                                type="text"
                                placeholder="Vui lòng nhập mã vé"
                                value={formData.serial_number}
                                onChange={handleChange}
                            />
                            {errors.serial_number && <span className="error">{errors.serial_number}</span>}
                        </div>

                        {notFound && (
                            <div className="error-message">
                                Không tìm thấy thông tin vé. Vui lòng kiểm tra lại số điện thoại và mã vé.
                            </div>
                        )}

                        <button type="submit" className="submit-btn">
                            Tra cứu
                        </button>
                    </form>
                </div>
            </div>

            {/* Modal to display ticket information */}
            {showModal && ticketInfo && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>THÔNG TIN VÉ</h3>
                            <button className="close-btn" onClick={closeModal}>&times;</button>
                        </div>

                        <div className="modal-body">
                            <div className="info-section">
                                <h4>Thông tin vé</h4>
                                <div className="info-row">
                                    <span className="info-label">Mã vé:</span>
                                    <span className="info-value">{ticketInfo.serial_number}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Trạng thái:</span>
                                    <span className={`status-badge status-${ticketInfo.ticket_status.toLowerCase()}`}>
                                        {ticketInfo.ticket_status}
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Mã ghế:</span>
                                    <span className="info-value">{ticketInfo.seat_code}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Giá vé:</span>
                                    <span className="info-value price">{formatCurrency(ticketInfo.seat_price)}</span>
                                </div>
                            </div>

                            <div className="info-section">
                                <h4>Thông tin chuyến đi</h4>
                                <div className="info-row">
                                    <span className="info-label">Ngày khởi hành:</span>
                                    <span className="info-value">{formatDateTime(ticketInfo.trip.service_date)}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Trạm khởi hành:</span>
                                    <span className="info-value">{ticketInfo.route.departure_station}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Thành phố:</span>
                                    <span className="info-value">{ticketInfo.route.departure_city}, {ticketInfo.route.departure_province}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Quãng đường:</span>
                                    <span className="info-value">{ticketInfo.route.distance} km</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Thời gian ước tính:</span>
                                    <span className="info-value">{ticketInfo.route.default_duration_time}</span>
                                </div>
                            </div>

                            <div className="info-section">
                                <h4>Thông tin xe</h4>
                                <div className="info-row">
                                    <span className="info-label">Biển số xe:</span>
                                    <span className="info-value">{ticketInfo.bus.plate_number}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Loại xe:</span>
                                    <span className="info-value">{ticketInfo.bus.vehicle_type}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Sức chứa:</span>
                                    <span className="info-value">{ticketInfo.bus.capacity} ghế</span>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="close-modal-btn" onClick={closeModal}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </>
    );
}
