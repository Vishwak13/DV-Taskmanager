import { useState, useEffect } from 'react';
import { Bell, Settings, Users, Calendar, CheckSquare, MoreVertical, LogOut, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_to_name?: string;
  priority: 'Low' | 'Medium' | 'High';
  due_date: string;
  status: string;
  created_at: string;
}

interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_seen: string;
  email: string;
  name: string;
}

interface Attachment {
  file: File;
  preview: string;
}

interface DashboardPageProps {
  onNavigate: (page: string, taskId?: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserPresence[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'next' | 'overdue'>('all');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    assignedTo: '',
    priority: 'Medium',
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onNavigate('login');
        return;
      }
      setCurrentUserId(user.id);
      await initializeUserPresence(user.id);
      await loadTasks();
      await loadTeamMembers();
    };
    checkAuth();

    const handleVisibilityChange = () => {
      updatePresence(!document.hidden);
    };

    const handleBeforeUnload = () => {
      updatePresence(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    const presenceInterval = setInterval(() => {
      if (!document.hidden) {
        updatePresence(true);
      }
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(presenceInterval);
      updatePresence(false);
    };
  }, [onNavigate]);

  const initializeUserPresence = async (userId: string) => {
    const { error } = await supabase
      .from('user_presence')
      .upsert({
        user_id: userId,
        is_online: true,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) console.error('Error initializing presence:', error);
  };

  const updatePresence = async (isOnline: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_presence')
      .upsert({
        user_id: user.id,
        is_online: isOnline,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
  };

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:assigned_to(id, email, raw_user_meta_data)
      `)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error loading tasks:', error);
      return;
    }

    const tasksWithNames = data.map((task: any) => ({
      ...task,
      assigned_to_name: task.assigned_user?.raw_user_meta_data?.name || task.assigned_user?.email || 'Unassigned'
    }));

    setTasks(tasksWithNames);
  };

  const loadTeamMembers = async () => {
    const { data: users } = await supabase.auth.admin.listUsers();

    if (!users) return;

    const { data: presenceData } = await supabase
      .from('user_presence')
      .select('*');

    const members: UserPresence[] = users.users.map(user => {
      const presence = presenceData?.find(p => p.user_id === user.id);
      return {
        user_id: user.id,
        is_online: presence?.is_online || false,
        last_seen: presence?.last_seen || user.created_at,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
      };
    });

    setTeamMembers(members);
  };

  const handleLogout = async () => {
    await updatePresence(false);
    await supabase.auth.signOut();
    onNavigate('login');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newAttachments.push({
            file,
            preview: event.target.result as string
          });
          setAttachments(prev => [...prev, ...newAttachments]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.dueDate || !newTask.assignedTo) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: newTask.title,
        description: newTask.description,
        assigned_to: newTask.assignedTo,
        created_by: user.id,
        priority: newTask.priority,
        due_date: newTask.dueDate,
        status: 'Not Started'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return;
    }

    if (attachments.length > 0 && data) {
      for (const attachment of attachments) {
        const fileExt = attachment.file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `task-attachments/${data.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, attachment.file);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);

          await supabase.from('task_attachments').insert({
            task_id: data.id,
            file_name: attachment.file.name,
            file_url: publicUrl,
            file_type: attachment.file.type,
            file_size: attachment.file.size,
            uploaded_by: user.id
          });
        }
      }
    }

    setNewTask({ title: '', description: '', dueDate: '', assignedTo: '', priority: 'Medium' });
    setAttachments([]);
    await loadTasks();
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const formatLastSeen = (lastSeen: string) => {
    const now = new Date();
    const seen = new Date(lastSeen);
    const diffMs = now.getTime() - seen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#F1F3F7] flex" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
      <div className="w-64 bg-white rounded-r-3xl shadow-lg p-6 flex flex-col gap-8">
        <div className="flex items-center gap-2">
          <CheckSquare size={32} className="text-[#004CFF]" />
          <h1 className="text-xl font-[800] text-[#1A1A1A]">Task Manager</h1>
        </div>

        <nav className="flex flex-col gap-3">
          <div className="px-4 py-3 rounded-2xl bg-[#004CFF] text-white font-[600] flex items-center gap-3 cursor-pointer">
            <CheckSquare size={20} />
            Dashboard
          </div>
          <div
            onClick={() => onNavigate('myTasks')}
            className="px-4 py-3 rounded-2xl text-[#6D6D6D] font-[500] flex items-center gap-3 hover:bg-[#F1F3F7] transition-colors cursor-pointer"
          >
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
          <h2 className="text-3xl font-[800] text-[#1A1A1A]">Dashboard</h2>
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

        <div className="px-8 pb-8 grid grid-cols-3 gap-6 flex-1">
          <div className="col-span-1 flex flex-col gap-6">
            <div className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] p-6">
              <h3 className="text-lg font-[700] text-[#1A1A1A] mb-4">Team Availability</h3>
              <div className="flex flex-col gap-4">
                {teamMembers.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#004CFF] text-white flex items-center justify-center font-[700] text-sm">
                      {getInitials(member.name)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-[600] text-[#1A1A1A]">{member.name}</p>
                      <p className="text-xs text-[#6D6D6D]">
                        {member.is_online ? 'Online' : `Last active ${formatLastSeen(member.last_seen)}`}
                      </p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${member.is_online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] p-6">
              <h3 className="text-lg font-[700] text-[#1A1A1A] mb-4">Assign New Task</h3>
              <form onSubmit={handleAddTask} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="px-4 py-3 rounded-2xl border-2 border-[#D0D4DC] focus:outline-none focus:border-[#004CFF] transition-colors text-sm"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="px-4 py-3 rounded-2xl border-2 border-[#D0D4DC] focus:outline-none focus:border-[#004CFF] transition-colors text-sm resize-none h-20"
                />

                <div className="relative">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-[#D0D4DC] hover:border-[#004CFF] transition-colors text-sm text-[#6D6D6D] cursor-pointer"
                  >
                    <Upload size={16} />
                    Attach Files
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-[#F1F3F7] rounded-xl">
                        <span className="text-xs text-[#1A1A1A] flex-1 truncate">{attachment.file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="px-4 py-3 rounded-2xl border-2 border-[#D0D4DC] focus:outline-none focus:border-[#004CFF] transition-colors text-sm"
                  required
                />
                <select
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                  className="px-4 py-3 rounded-2xl border-2 border-[#D0D4DC] focus:outline-none focus:border-[#004CFF] transition-colors text-sm"
                  required
                >
                  <option value="">Select employee</option>
                  {teamMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="px-4 py-3 rounded-2xl border-2 border-[#D0D4DC] focus:outline-none focus:border-[#004CFF] transition-colors text-sm"
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>
                <button
                  type="submit"
                  className="w-full bg-[#004CFF] text-white font-[600] text-base px-9 py-4 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-200 hover:bg-[#0040CC] hover:shadow-[0_12px_32px_rgba(0,76,255,0.2)]"
                >
                  Add Task
                </button>
              </form>
            </div>
          </div>

          <div className="col-span-2 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-380px)]">
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="text-sm text-[#004CFF] font-[500] hover:underline self-start"
              >
                Show all tasks
              </button>
            )}
            {filteredTasks.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] p-8 text-center">
                <p className="text-[#6D6D6D]">No tasks found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
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
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#FF8A34] text-white flex items-center justify-center font-[700] text-xs">
                          {getInitials(task.assigned_to_name || 'U')}
                        </div>
                        <span className="text-sm font-[500] text-[#1A1A1A]">{task.assigned_to_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-[600] px-3 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="text-xs text-[#6D6D6D]">{task.due_date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
