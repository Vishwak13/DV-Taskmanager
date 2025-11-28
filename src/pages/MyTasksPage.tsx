import { useState, useEffect } from 'react';
import { Bell, Settings, Users, Calendar, CheckSquare, MoreVertical, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  priority: 'Low' | 'Medium' | 'High';
  due_date: string;
  status: string;
  created_at: string;
}

interface MyTasksPageProps {
  onNavigate: (page: string, taskId?: string) => void;
}

export function MyTasksPage({ onNavigate }: MyTasksPageProps) {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'next' | 'overdue'>('all');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onNavigate('login');
        return;
      }
      setCurrentUserId(user.id);
      await loadMyTasks(user.id);
    };
    checkAuth();
  }, [onNavigate]);

  const loadMyTasks = async (userId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', userId)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error loading tasks:', error);
      return;
    }

    setTasks(data || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onNavigate('login');
  };

  const getCategoryFromDate = (dueDate: string): 'today' | 'next' | 'overdue' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (due < today) return 'overdue';
    if (due.getTime() === today.getTime()) return 'today';
    return 'next';
  };

  const filterTasks = (tasks: Task[]) => {
    if (activeFilter === 'all') return tasks;
    return tasks.filter(task => getCategoryFromDate(task.due_date) === activeFilter);
  };

  const filteredTasks = filterTasks(tasks);
  const todayCount = tasks.filter(t => getCategoryFromDate(t.due_date) === 'today').length;
  const nextCount = tasks.filter(t => getCategoryFromDate(t.due_date) === 'next').length;
  const overdueCount = tasks.filter(t => getCategoryFromDate(t.due_date) === 'overdue').length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'Low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F3F7] flex" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
      <div className="w-64 bg-white rounded-r-3xl shadow-lg p-6 flex flex-col gap-8">
        <div className="flex items-center gap-2">
          <CheckSquare size={32} className="text-[#004CFF]" />
          <h1 className="text-xl font-[800] text-[#1A1A1A]">Task Manager</h1>
        </div>

        <nav className="flex flex-col gap-3">
          <div
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-3 rounded-2xl text-[#6D6D6D] font-[500] flex items-center gap-3 hover:bg-[#F1F3F7] transition-colors cursor-pointer"
          >
            <CheckSquare size={20} />
            Dashboard
          </div>
          <div className="px-4 py-3 rounded-2xl bg-[#004CFF] text-white font-[600] flex items-center gap-3 cursor-pointer">
            <CheckSquare size={20} />
            My Tasks
          </div>
          <div
            onClick={() => onNavigate('employees')}
            className="px-4 py-3 rounded-2xl text-[#6D6D6D] font-[500] flex items-center gap-3 hover:bg-[#F1F3F7] transition-colors cursor-pointer"
          >
            <Users size={20} />
            Employees
          </div>
          <div
            onClick={() => onNavigate('calendar')}
            className="px-4 py-3 rounded-2xl text-[#6D6D6D] font-[500] flex items-center gap-3 hover:bg-[#F1F3F7] transition-colors cursor-pointer"
          >
            <Calendar size={20} />
            Calendar
          </div>
          <div
            onClick={() => onNavigate('settings')}
            className="px-4 py-3 rounded-2xl text-[#6D6D6D] font-[500] flex items-center gap-3 hover:bg-[#F1F3F7] transition-colors cursor-pointer"
          >
            <Settings size={20} />
            Settings
          </div>
        </nav>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-[#E5E7EB] px-8 py-5 flex items-center justify-between">
          <h2 className="text-3xl font-[800] text-[#1A1A1A]">My Tasks</h2>
          <div className="flex items-center gap-6">
            <Bell size={24} className="text-[#6D6D6D] cursor-pointer hover:text-[#004CFF] transition-colors" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-[#6D6D6D] hover:text-red-500 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
            >
              <LogOut size={20} />
              <span className="text-sm font-[500]">Logout</span>
            </button>
          </div>
        </div>

        <div className="px-8 py-8 grid grid-cols-3 gap-6">
          <div
            onClick={() => setActiveFilter('today')}
            className={`bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] p-6 border-l-4 border-[#004CFF] cursor-pointer transition-all hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] ${activeFilter === 'today' ? 'ring-2 ring-[#004CFF]' : ''}`}
          >
            <p className="text-[#6D6D6D] font-[500] text-sm">Today</p>
            <p className="text-4xl font-[800] text-[#1A1A1A] mt-2">{todayCount}</p>
          </div>
          <div
            onClick={() => setActiveFilter('next')}
            className={`bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] p-6 border-l-4 border-[#FF8A34] cursor-pointer transition-all hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] ${activeFilter === 'next' ? 'ring-2 ring-[#FF8A34]' : ''}`}
          >
            <p className="text-[#6D6D6D] font-[500] text-sm">Next</p>
            <p className="text-4xl font-[800] text-[#1A1A1A] mt-2">{nextCount}</p>
          </div>
          <div
            onClick={() => setActiveFilter('overdue')}
            className={`bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] p-6 border-l-4 border-red-500 cursor-pointer transition-all hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] ${activeFilter === 'overdue' ? 'ring-2 ring-red-500' : ''}`}
          >
            <p className="text-[#6D6D6D] font-[500] text-sm">Overdue</p>
            <p className="text-4xl font-[800] text-[#1A1A1A] mt-2">{overdueCount}</p>
          </div>
        </div>

        <div className="px-8 pb-8 flex-1">
          {activeFilter !== 'all' && (
            <button
              onClick={() => setActiveFilter('all')}
              className="text-sm text-[#004CFF] font-[500] hover:underline mb-4"
            >
              Show all tasks
            </button>
          )}
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] p-8 text-center">
              <p className="text-[#6D6D6D]">No tasks assigned to you</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onNavigate('taskDetails', task.id)}
                  className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] p-5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] transition-all cursor-pointer border-l-4 border-[#004CFF]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-[600] text-[#1A1A1A] text-base flex-1">{task.title}</h4>
                    <MoreVertical size={18} className="text-[#6D6D6D] hover:text-[#004CFF] transition-colors" />
                  </div>
                  <p className="text-sm text-[#6D6D6D] mb-4">{task.description}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-[600] px-3 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="text-xs text-[#6D6D6D]">{task.due_date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
