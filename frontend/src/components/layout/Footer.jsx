import React from 'react';
import { FiPhone, FiMail, FiMapPin, FiFacebook, FiInstagram, FiYoutube } from 'react-icons/fi';
import '../../App.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Column 1: Hotline & Customer Support */}
        <div className="footer-column">
          <h3>Customer Support</h3>
          <div className="hotline-box">
            <span>24/7 Hotline</span>
            <strong>1900 0000</strong>
          </div>
          <p>
            <FiMail style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            support@vietbus.demo
          </p>
          <div className="social-links">
            <a href="#" className="social-link"><FiFacebook /></a>
            <a href="#" className="social-link"><FiInstagram /></a>
            <a href="#" className="social-link"><FiYoutube /></a>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div className="footer-column">
          <h3>Quick Links</h3>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/schedule">Book Tickets</a></li>
            <li><a href="/lookup">Track Booking</a></li>
            <li><a href="#">About Us</a></li>
            <li><a href="#">Terms & Conditions</a></li>
          </ul>
        </div>

        {/* Column 3: Contact Information */}
        <div className="footer-column">
          <h3>VietBus - Student Project</h3>
          <p>
            <FiMapPin style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            123 Demo Street, District 1, Ho Chi Minh City, Vietnam
          </p>
          <p>
            <FiPhone style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            028 1234 5678
          </p>
          <p>
            <FiMail style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            contact@vietbus.demo
          </p>
        </div>
      </div>

      {/* Copyright */}
      <div className="copyright">
        <p>&copy; {new Date().getFullYear()} VietBus - Database Assignment Project. For educational purposes only.</p>
      </div>
    </footer>
  );
};

export default Footer;