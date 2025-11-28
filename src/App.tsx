import { useState } from 'react';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { CalendarPage } from './pages/CalendarPage';
import { SettingsPage } from './pages/SettingsPage';
import { TaskDetailsPage } from './pages/TaskDetailsPage';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [taskId, setTaskId] = useState<string>();

  const handleNavigate = (page: string, id?: string) => {
    setCurrentPage(page);
    if (id) {
      setTaskId(id);
    }
  };

  return (
    <>
      {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
      {currentPage === 'login' && <LoginPage onNavigate={handleNavigate} />}
      {currentPage === 'signup' && <SignUpPage onNavigate={handleNavigate} />}
      {currentPage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
      {currentPage === 'myTasks' && <MyTasksPage onNavigate={handleNavigate} />}
      {currentPage === 'employees' && <EmployeesPage onNavigate={handleNavigate} />}
      {currentPage === 'calendar' && <CalendarPage onNavigate={handleNavigate} />}
      {currentPage === 'settings' && <SettingsPage onNavigate={handleNavigate} />}
      {currentPage === 'taskDetails' && <TaskDetailsPage taskId={taskId} onNavigate={handleNavigate} />}
    </>
  );
}

export default App;
