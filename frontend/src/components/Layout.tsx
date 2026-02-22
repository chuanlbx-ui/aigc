import { Layout, Menu, Dropdown, Avatar, Space, message } from 'antd';
import {
  HomeOutlined,
  FormOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  BookOutlined,
  PictureOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  SendOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  CrownOutlined,
  BulbOutlined,
  GlobalOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';
import { useAuthStore } from '../stores/authStore';
import ApiSwitcher from './ApiSwitcher';

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

// 3大功能中心的菜单结构
const menuItems: MenuItem[] = [
  {
    key: '/workspace',
    icon: <HomeOutlined />,
    label: '工作台',
  },
  {
    key: 'create',
    icon: <FormOutlined />,
    label: '创作中心',
    children: [
      { key: '/topic-suggestions', icon: <BulbOutlined />, label: '智能选题' },
      { key: '/articles', icon: <FormOutlined />, label: '文章创作' },
      { key: '/posters', icon: <FileImageOutlined />, label: '海报生成' },
      { key: '/editor', icon: <VideoCameraOutlined />, label: '视频制作' },
    ],
  },
  {
    key: 'resource',
    icon: <BookOutlined />,
    label: '资源中心',
    children: [
      { key: '/knowledge', icon: <BookOutlined />, label: '知识库' },
      { key: '/assets', icon: <PictureOutlined />, label: '素材库' },
      { key: '/templates', icon: <AppstoreOutlined />, label: '模板库' },
    ],
  },
  {
    key: 'manage',
    icon: <SettingOutlined />,
    label: '管理中心',
    children: [
      { key: '/tasks', icon: <UnorderedListOutlined />, label: '任务队列' },
      { key: '/publish', icon: <SendOutlined />, label: '发布管理' },
      { key: '/publish/platforms', icon: <SettingOutlined />, label: '平台配置' },
      { key: '/publish/records', icon: <UnorderedListOutlined />, label: '发布记录' },
      { key: '/statistics', icon: <BarChartOutlined />, label: '数据统计' },
      { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
    ],
  },
  {
    key: 'portal',
    icon: <GlobalOutlined />,
    label: '门户管理',
    children: [
      { key: '/topic-pages', icon: <AppstoreOutlined />, label: '专题页面' },
      { key: '/api-tokens', icon: <KeyOutlined />, label: 'API令牌' },
    ],
  },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    message.success('已退出登录');
    navigate('/login');
  };

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'billing',
      icon: <CrownOutlined />,
      label: '订阅管理',
      onClick: () => navigate('/billing'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/' || path === '/workspace') return '/workspace';

    // 遍历所有菜单项找到匹配的
    for (const item of menuItems) {
      if (item && 'key' in item && item.key === path) return path;
      if (item && 'children' in item && item.children) {
        for (const child of item.children) {
          if (child && 'key' in child && path.startsWith(child.key as string)) {
            return child.key as string;
          }
        }
      }
    }
    return '/workspace';
  };

  // 获取当前页面标题
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/workspace') return '工作台';

    for (const item of menuItems) {
      if (item && 'key' in item && item.key === path && 'label' in item) {
        return item.label as string;
      }
      if (item && 'children' in item && item.children) {
        for (const child of item.children) {
          if (child && 'key' in child && path.startsWith(child.key as string) && 'label' in child) {
            return child.label as string;
          }
        }
      }
    }
    return '工作台';
  };

  // 获取需要展开的子菜单
  const getOpenKeys = () => {
    const path = location.pathname;
    for (const item of menuItems) {
      if (item && 'children' in item && item.children) {
        for (const child of item.children) {
          if (child && 'key' in child && path.startsWith(child.key as string)) {
            return [item.key as string];
          }
        }
      }
    }
    return [];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 18,
          fontWeight: 600,
        }}>
          内容创作平台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, lineHeight: '64px' }}>
            {getPageTitle()}
          </h2>
          <Space size="large">
            <ApiSwitcher />
            {user && (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar icon={<UserOutlined />} />
                  <span>{user.name || user.email}</span>
                </Space>
              </Dropdown>
            )}
          </Space>
        </Header>
        <Content style={{ margin: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
