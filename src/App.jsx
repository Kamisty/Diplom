import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext/Auth';
import Header from './components/common/Header/Header';
import Footer from './components/common/Footer/Footer';
import Home from './pages/Home/Home';
import Profile from './pages/Profile/Profile';
import Register from './pages/Register/Register';
import Input from './pages/Input/Input';
import Dashboard from './pages/Dashboard/Dashboard';
import CreateConference from './pages/Conference/CreateConference';
import ManageConferences from './pages/Conference/ManageConferences';
import SubmitReport from './pages/Reports/SubmitReport';
import MyReports from './pages/Reports/MyReports';
import ReviewReports from './pages/Reports/ReviewReports';
import ReportDetail from './pages/Reports/ReportDetail'; 
import ManageUsers from './pages/Admin/ManageUsers';
import AssignSectionHeads from './pages/Admin/AssignSectionHeads';
import RoleBasedRoute from './components/RoleBasedRoute';
import AccessDenied from './pages/AccessDenied/AccessDenied';
import SectionHeadDashboard from './pages/Section_heder/Section_header';
import EditConference from './pages/Conference/EditConference';
import ConferenceDetails from './pages/Conference/ConferenceDetails';
import './App.css';
import './context/font.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Header />
          
          <main className="main-content">
            <Routes>
              {/* Публичные маршруты */}
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/register" element={<Register />} />
              <Route path="/input" element={<Input />} />
              <Route path="/access-denied" element={<AccessDenied />} />
              
              {/* Защищенные маршруты */}
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Маршруты с проверкой ролей */}
              <Route path="/submit-report" element={
                <RoleBasedRoute requiredPermission="submit_report">
                  <SubmitReport />
                </RoleBasedRoute>
              } />
              
              <Route path="/my-reports" element={
                <RoleBasedRoute requiredPermission="view_own_reports">
                  <MyReports />
                </RoleBasedRoute>
              } />
              
              <Route path="/admin/create-conference" element={
                <RoleBasedRoute requiredPermission="create_conference">
                  <CreateConference />
                </RoleBasedRoute>
              } />
              
              <Route path="/admin/users" element={
                <RoleBasedRoute requiredPermission="manage_users">
                  <ManageUsers />
                </RoleBasedRoute>
              } />

              <Route path="/admin/conferences" element={
                <RoleBasedRoute requiredPermission="edit_conference">
                  <ManageConferences />
                </RoleBasedRoute>
              } />
              
              <Route path="/admin/assign-section-heads" element={
                <RoleBasedRoute requiredPermission="assign_section_heads">
                  <AssignSectionHeads />
                </RoleBasedRoute>
              } />
              
              <Route path="/review/assigned" element={
                <RoleBasedRoute requiredPermission="view_assigned_reports">
                  <ReviewReports />
                </RoleBasedRoute>
              } />

              <Route path="/section-head/dashboard" element={
                <RoleBasedRoute requiredPermission="section_head_access">
                  <SectionHeadDashboard />
                </RoleBasedRoute>
              } />

              <Route path="/admin/edit-conference/:id" element={
            <RoleBasedRoute requiredPermission="edit_conference">
              <EditConference />
            </RoleBasedRoute>
              } />

              <Route path="/review-reports" element={<ReviewReports/>} />

               <Route path="/report/:id" element={<ReportDetail />} />
             

              <Route path="/conference/:id" element={<ConferenceDetails />} />
            </Routes>
          </main>
          
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;