import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Workspace from './pages/Workspace';
import Projects from './pages/Projects';
import Editor from './pages/Editor';
import Assets from './pages/Assets';
import Tasks from './pages/Tasks';
import Knowledge from './pages/Knowledge';
import KnowledgeDetail from './pages/KnowledgeDetail';
import KnowledgeEditor from './pages/KnowledgeEditor';
import Articles from './pages/Articles';
import ArticleEditor from './pages/ArticleEditor';
import ArticleRead from './pages/ArticleRead';
import Topics from './pages/Topics';
import TopicSuggestions from './pages/TopicSuggestions';
import Posters from './pages/Posters';
import PosterEditor from './pages/PosterEditor';
import Templates from './pages/Templates';
import TemplateMarketplace from './pages/TemplateMarketplace';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Settings from './pages/Settings';
import Statistics from './pages/Statistics';
import Billing from './pages/Billing';
import PublishPlatforms from './pages/PublishPlatforms';
import PublishRecords from './pages/PublishRecords';
import PublishDashboard from './pages/PublishDashboard';
import TopicPages from './pages/TopicPages';
import TopicPageEditor from './pages/TopicPageEditor';
import ApiTokens from './pages/ApiTokens';
import PortalHome from './pages/portal/PortalHome';
import PortalPage from './pages/portal/PortalPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 登录页 */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* 公开阅读页 - 不需要布局 */}
        <Route path="/read/:slug" element={<ArticleRead />} />
        <Route path="/topics" element={<Topics />} />

        {/* Portal 用户端H5页面 - 公开访问 */}
        <Route path="/p" element={<PortalHome />} />
        <Route path="/p/:slug" element={<PortalPage />} />

        {/* 管理后台 - 需要登录 */}
        <Route path="/" element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/workspace" replace />} />
          <Route path="workspace" element={<Workspace />} />

          {/* 创作中心 */}
          <Route path="topic-suggestions" element={<TopicSuggestions />} />
          <Route path="articles" element={<Articles />} />
          <Route path="articles/:id/edit" element={<ArticleEditor />} />
          <Route path="posters" element={<Posters />} />
          <Route path="posters/new" element={<PosterEditor />} />
          <Route path="posters/:id/edit" element={<PosterEditor />} />
          <Route path="editor" element={<Projects />} />
          <Route path="editor/new" element={<Editor />} />
          <Route path="editor/:id/edit" element={<Editor />} />

          {/* 资源中心 */}
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="knowledge/new" element={<KnowledgeEditor />} />
          <Route path="knowledge/:id" element={<KnowledgeDetail />} />
          <Route path="knowledge/:id/edit" element={<KnowledgeEditor />} />
          <Route path="assets" element={<Assets />} />
          <Route path="templates" element={<Templates />} />
          <Route path="marketplace" element={<TemplateMarketplace />} />

          {/* 管理中心 */}
          <Route path="tasks" element={<Tasks />} />
          <Route path="publish" element={<PublishDashboard />} />
          <Route path="publish/platforms" element={<PublishPlatforms />} />
          <Route path="publish/records" element={<PublishRecords />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="billing" element={<Billing />} />

          {/* Portal 管理 */}
          <Route path="topic-pages" element={<TopicPages />} />
          <Route path="topic-pages/:id/edit" element={<TopicPageEditor />} />
          <Route path="api-tokens" element={<ApiTokens />} />

          {/* 兼容旧路由 */}
          <Route path="projects" element={<Projects />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
