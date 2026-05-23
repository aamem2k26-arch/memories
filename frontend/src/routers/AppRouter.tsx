import Home from '../pages/Home/Home';
import Login from '../pages/Login/Login';
import { Album } from '../pages/Album/Album';
import { Trash } from '../pages/Trash/Trash';
import { ProtectedRoute } from './ProtectedRouter';
import { MainLayout } from '../components/MainLayout';
import { Category } from '../pages/Category/Category';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Protected Dashboard Routes */}
        <Route element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route path="home" element={<Home />} />
          <Route path="category/:type" element={<Category />} />
          <Route path="category/:type/album/:albumName" element={<Album />} />
          <Route path="trash" element={<Trash />} />
        </Route>
        
        {/* Fallback redirects to login */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;