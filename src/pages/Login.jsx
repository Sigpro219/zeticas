import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, UserPlus, LogIn, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const deepTeal = "#025357";
const institutionOcre = "#D6BD98";
const lightSage = "#f8f9f5";

const Login = () => {
    const navigate = useNavigate();
    const { login, loginWithGoogle } = useAuth();

    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [rememberMe, setRememberMe] = React.useState(true);
    const [isHovered, setIsHovered] = React.useState(false);

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        try {
            await login(email, password);
            navigate('/gestion');
        } catch (err) {
            console.error("Mock Login Error:", err);
            alert('Credenciales incorrectas. (Modo Simulado: admin@zeticas.com / admin123)');
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
            navigate('/gestion');
        } catch (err) {
            console.error("Mock Google Login Error:", err);
        }
    };

    return (
        <div className="login-page botanical-bg" style={{
            minHeight: '90vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            background: lightSage,
            position: 'relative'
        }}>
            {/* Soft decorative elements */}
            <div style={{
                position: 'absolute',
                top: '10%',
                right: '5%',
                width: '300px',
                height: '300px',
                background: 'rgba(214, 189, 152, 0.1)',
                borderRadius: '50%',
                filter: 'blur(80px)',
                zIndex: 0
            }}></div>
            <div style={{
                position: 'absolute',
                bottom: '10%',
                left: '5%',
                width: '250px',
                height: '250px',
                background: 'rgba(2, 83, 87, 0.05)',
                borderRadius: '50%',
                filter: 'blur(60px)',
                zIndex: 0
            }}></div>

            <div className="container" style={{ maxWidth: '500px', zIndex: 1 }}>
                <div style={{
                    background: '#fff',
                    padding: '4rem',
                    borderRadius: '40px',
                    boxShadow: '0 40px 100px rgba(2, 83, 87, 0.08)',
                    border: '1px solid rgba(2, 83, 87, 0.03)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '6px',
                        background: `linear-gradient(90deg, ${deepTeal}, ${institutionOcre})`
                    }}></div>

                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <div style={{ 
                            width: '60px', height: '60px', background: 'rgba(2, 83, 87, 0.05)', 
                            borderRadius: '20px', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', margin: '0 auto 1.5rem', color: deepTeal
                        }}>
                            <ShieldCheck size={32} />
                        </div>
                        <h1 className="font-serif" style={{ color: deepTeal, fontSize: '3rem', marginBottom: '0.8rem', lineHeight: '1.2' }}>Bienvenido</h1>
                        <p style={{ color: '#666', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: '700' }}>
                            Acceso Privado Zeticas
                        </p>
                    </div>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <label style={{ color: deepTeal, fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Usuario / Email
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type="text"
                                    placeholder="usuario@ejemplo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '1.2rem 1.2rem 1.2rem 3.5rem',
                                        background: '#fcfcfc',
                                        border: '1px solid #eee',
                                        borderRadius: '16px',
                                        color: '#333',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.border = `1px solid ${institutionOcre}`;
                                        e.target.style.boxShadow = `0 4px 20px rgba(214, 189, 152, 0.15)`;
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.border = '1px solid #eee';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ color: deepTeal, fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    Contraseña
                                </label>
                                <Link to="#" style={{ color: institutionOcre, fontSize: '0.8rem', fontWeight: '700', textDecoration: 'none' }}>
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '1.2rem 4rem 1.2rem 3.5rem',
                                        background: '#fcfcfc',
                                        border: '1px solid #eee',
                                        borderRadius: '16px',
                                        color: '#333',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.border = `1px solid ${institutionOcre}`;
                                        e.target.style.boxShadow = `0 4px 20px rgba(214, 189, 152, 0.15)`;
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.border = '1px solid #eee';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '1.2rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#aaa',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input
                                type="checkbox"
                                id="remember"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                style={{ 
                                    width: '18px', height: '18px', 
                                    cursor: 'pointer', 
                                    accentColor: deepTeal 
                                }}
                            />
                            <label htmlFor="remember" style={{ color: '#666', fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
                                Mantener sesión abierta
                            </label>
                        </div>

                        <button
                            type="submit"
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            style={{
                                background: isHovered ? '#014346' : deepTeal,
                                color: '#fff',
                                padding: '1.4rem',
                                borderRadius: '16px',
                                border: 'none',
                                fontWeight: '900',
                                fontSize: '1rem',
                                letterSpacing: '2px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '1rem',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isHovered ? '0 15px 30px rgba(2, 83, 87, 0.25)' : '0 10px 20px rgba(2, 83, 87, 0.15)',
                                transform: isHovered ? 'translateY(-2px)' : 'none'
                            }}
                        >
                            <LogIn size={20} />
                            INGRESAR
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '2rem', borderTop: '1px solid #f0f0f0' }}>
                            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                ¿Aún no tienes cuenta?
                            </p>
                            <button
                                type="button"
                                style={{
                                    border: `2px solid ${institutionOcre}`,
                                    color: institutionOcre,
                                    padding: '0.8rem 2.5rem',
                                    borderRadius: '50px',
                                    fontWeight: '900',
                                    fontSize: '0.85rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.8rem',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = institutionOcre;
                                    e.target.style.color = '#fff';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'transparent';
                                    e.target.style.color = institutionOcre;
                                }}
                            >
                                <UserPlus size={18} />
                                SOLICITAR ACCESO
                            </button>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                style={{
                                    border: '1px solid #e2e8f0',
                                    color: '#475569',
                                    padding: '0.8rem 2.5rem',
                                    borderRadius: '50px',
                                    fontWeight: '700',
                                    fontSize: '0.85rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.8rem',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" alt="Google" style={{ width: '18px' }} />
                                INGRESAR CON GOOGLE
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
