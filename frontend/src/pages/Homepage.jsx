import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SearchForm from '../components/features/SearchForm';
import { FiCheckCircle, FiMap, FiShield, FiClock, FiCreditCard, FiHeadphones } from 'react-icons/fi';
import '../App.css';

export default function Homepage() {
    const features = [
        {
            icon: <FiMap />,
            title: 'Extensive Network',
            desc: 'Connecting more than 20 provinces with hundreds of daily trips across Vietnam.',
        },
        {
            icon: <FiShield />,
            title: 'Safe & Reliable',
            desc: 'Trusted bus partners with on-time, on-route commitments and safety standards.',
        },
        {
            icon: <FiCheckCircle />,
            title: 'Easy Booking',
            desc: 'Simple flow that locks seats instantly in just three easy steps.',
        },
    ];

    const stats = [
        { number: '20+', label: 'Provinces' },
        { number: '500+', label: 'Daily Trips' },
        { number: '1M+', label: 'Happy Customers' },
        { number: '24/7', label: 'Support' },
    ];

    return (
        <>
            <Header />
            <main className="homepage">
                {/* === HERO SECTION === */}
                <section className="hero-simple">
                    <div className="hero-overlay">
                        <div className="hero-text">
                            <p className="hero-subtitle-small">Welcome to Vietnam's Bus Booking Demo Platform</p>
                            <h1>Book Your Journey <br/>With Confidence</h1>
                            <p className="hero-description">Fast, secure, and convenient bus ticket booking - Student Project</p>
                        </div>
                        
                        {/* Search form */}
                        <div className="hero-search-container">
                            <SearchForm />
                        </div>
                    </div>
                </section>

                {/* === STATS SECTION === */}
                <section className="stats-section">
                    <div className="container">
                        <div className="stats-grid">
                            {stats.map((stat, index) => (
                                <div key={index} className="stat-item">
                                    <span className="stat-number">{stat.number}</span>
                                    <span className="stat-label">{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* === FEATURE SECTION === */}
                <section className="features-simple">
                    <div className="container">
                        <h2 className="section-title">Why Choose VietBus?</h2>
                        <p className="section-subtitle">Experience our demo bus travel service</p>
                        <div className="feature-grid-simple">
                            {features.map((f, index) => (
                                <div key={index} className="feature-item">
                                    <div className="feature-icon">{f.icon}</div>
                                    <h3>{f.title}</h3>
                                    <p>{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* === HOW IT WORKS === */}
                <section className="how-it-works">
                    <div className="container">
                        <h2 className="section-title">How It Works</h2>
                        <p className="section-subtitle">Book your trip in 3 simple steps</p>
                        <div className="steps-grid">
                            <div className="step-item">
                                <div className="step-number">1</div>
                                <h3>Search</h3>
                                <p>Enter your departure, destination, and travel date</p>
                            </div>
                            <div className="step-item">
                                <div className="step-number">2</div>
                                <h3>Select</h3>
                                <p>Choose from available buses and select your preferred seats</p>
                            </div>
                            <div className="step-item">
                                <div className="step-number">3</div>
                                <h3>Pay & Go</h3>
                                <p>Complete payment and receive your e-ticket instantly</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}