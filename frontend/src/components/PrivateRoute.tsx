/**
 * 路由守卫 - 保护需要登录的页面
 */

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { user, accessToken, checkAuth } = useAuthStore();
  const location = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      // 如果有 token，恢复 axios header 并验证
      if (accessToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        // 验证 token 是否有效
        if (!user) {
          await checkAuth();
        }
      }
      setIsInitialized(true);
    };

    initAuth();
  }, []);

  // 等待初始化完成
  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 未登录则跳转到登录页，并记录当前路径
  if (!accessToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
