import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ adminOnly = false, financeOnly = false, superuserOnly = false }) => {
    const { user, isAdmin, isFinance, isSuperuser, loading } = useAuth();

    if (loading) {
        return <div className="container" style={{ padding: '2rem' }}>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (superuserOnly && !isSuperuser) {
        return <Navigate to="/" replace />;
    }

    if (financeOnly && !isFinance) {
        return <Navigate to="/" replace />;
    }

    if (adminOnly && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
