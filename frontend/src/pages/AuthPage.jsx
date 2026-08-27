import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import { apiUrl } from '../utils/api';

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); // Chế độ: Đăng nhập (true) hay Đăng ký (false)
  const [role, setRole] = useState('passenger'); // Vai trò: Khách hàng (passenger) hay Nhân viên (staff)
  const [loading, setLoading] = useState(false);  

  // Dữ liệu Form (Được map đúng với các cột trong Database)
  const [formData, setFormData] = useState({
    full_name: '',      // Bảng PERSON
    email: '',          // Bảng ACCOUNT
    phone: '',          // Bảng ACCOUNT
    password: '',       // Bảng ACCOUNT
    confirm_pass: '',   // Chỉ dùng để kiểm tra ở frontend
    gov_id_number: '',  // Bảng PERSON (Số CMND/CCCD/Hộ chiếu)
    date_of_birth: '',  // Bảng PERSON
    hire_date: '',      // Bảng STAFF (Chỉ dành cho nhân viên)
    operator_id: '1'    // Bảng STAFF (Mặc định ID nhà xe là 1)
  });

  const [errors, setErrors] = useState({});

  // Hàm kiểm tra dữ liệu (Validation Logic)
  const validateForm = () => {
    const newErrors = {};
    
    // 1. Kiểm tra định dạng Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    // 2. Kiểm tra logic Đăng Ký
    if (!isLogin) {
        if (formData.password !== formData.confirm_pass) {
            newErrors.confirm_pass = "Passwords do not match";
        }
        if (!formData.full_name) newErrors.full_name = "Full name is required";
        if (!formData.phone) newErrors.phone = "Phone is required";
        if (!formData.gov_id_number) newErrors.gov_id_number = "National ID is required";
        if (!formData.date_of_birth) newErrors.date_of_birth = "Date of birth is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    
    // Endpoint API
    const endpoint = isLogin ? '/api/login' : '/api/register';
    const API_URL = apiUrl(endpoint);

    // Chuẩn bị dữ liệu
    const payload = isLogin 
        ? { 
            email: formData.email, 
            password: formData.password, 
            role: role 
          }
        : { 
            role: role.toUpperCase(),
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            gov_id: formData.gov_id_number,
            dob: formData.date_of_birth
          };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            
            if (isLogin) {
                const authPayload = { user: data.user, token: data.token };
                localStorage.setItem('auth', JSON.stringify(authPayload));
                // Keep backward compatibility with previous key if used elsewhere
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/');
                window.location.reload();
            } else {
                setIsLogin(true);
                setFormData(prev => ({ ...prev, password: '', confirm_pass: '' }));
            }
        } else {
            alert(data.message); 
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Cannot connect to server. Please ensure Backend is running.");
    } finally {
        setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  return (
    <>  
      <div className="auth-page">
        <div className="auth-container">
          <h2 className="auth-title">{isLogin ? 'SYSTEM LOGIN' : 'CREATE ACCOUNT'}</h2>
          
          <div className="role-tabs">
            <button 
                className={role === 'passenger' ? 'active' : ''} 
                onClick={() => setRole('passenger')} type="button">
                PASSENGER
            </button>
            <button 
                className={role === 'staff' ? 'active' : ''} 
                onClick={() => setRole('staff')} type="button">
                STAFF
            </button>
          </div>

          {!isLogin && (
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '12px 16px',
              margin: '16px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '20px', color: '#856404' }}>⚠️</span>
              <div style={{ fontSize: '14px', color: '#856404', lineHeight: '1.5' }}>
                <strong>Warning:</strong> This is a demo system. Please do not enter real personal information 
                (real ID numbers, real phone numbers, or sensitive data).
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
                <>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input 
                            name="full_name" 
                            type="text" 
                            placeholder="Ex: Nguyen Van A" 
                            onChange={handleChange} 
                        />
                        {errors.full_name && <span className="error">{errors.full_name}</span>}
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>National ID</label>
                            <input 
                                name="gov_id_number" 
                                type="text" 
                                placeholder="Ex: 0123456789"
                                onChange={handleChange} 
                            />
                            {errors.gov_id_number && <span className="error">{errors.gov_id_number}</span>}
                        </div>
                        <div className="form-group">
                            <label>Date of Birth</label>
                            <input 
                                name="date_of_birth" 
                                type="date" 
                                onChange={handleChange} 
                            />
                            {errors.date_of_birth && <span className="error">{errors.date_of_birth}</span>}
                        </div>
                    </div>
                </>
            )}

            <div className="form-group">
                <label>Email Address</label>
                <input 
                    name="email" 
                    type="text" 
                    placeholder="name@example.com"
                    onChange={handleChange} 
                />
                {errors.email && <span className="error">{errors.email}</span>}
            </div>

            {!isLogin && (
                <div className="form-group">
                    <label>Phone Number</label>
                    <input 
                        name="phone" 
                        type="text" 
                        placeholder="Ex: 0912345678"
                        onChange={handleChange} 
                    />
                    {errors.phone && <span className="error">{errors.phone}</span>}
                </div>
            )}

            <div className="form-group">
                <label>Password</label>
                <input 
                    name="password" 
                    type="password" 
                    placeholder="Enter your password"
                    onChange={handleChange} 
                />
                {errors.password && <span className="error">{errors.password}</span>}
            </div>

            {!isLogin && (
                <div className="form-group">
                    <label>Confirm Password</label>
                    <input 
                        name="confirm_pass" 
                        type="password" 
                        placeholder="Re-enter your password"
                        onChange={handleChange} 
                    />
                    {errors.confirm_pass && <span className="error">{errors.confirm_pass}</span>}
                </div>
            )}

            <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Processing...' : (isLogin ? 'LOGIN' : 'REGISTER')}
            </button>
          </form>

          <p className="switch-auth">
            <span onClick={() => {setIsLogin(!isLogin); setErrors({});}}>
                {isLogin ? 'Register Now' : 'Login Here'}
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
