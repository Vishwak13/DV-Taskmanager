import { useState, useEffect } from 'react';
import { Bell, Settings, Users, Calendar, CheckSquare, LogOut, MessageCircle, X, Send, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_seen: string;
  email: string;
  name: string;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  has_attachment: boolean;
  attachment_url?: string;
  attachment_name?: string;
  is_read: boolean;
  created_at: string;
}

interface EmployeesPageProps {
  onNavigate: (page: string) => void;
}

export function EmployeesPage({ onNavigate }: EmployeesPageProps) {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<UserPresence[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserPresence | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onNavigate('login');
        return;
      }
      setCurrentUserId(user.id);
      await loadTeamMembers();
    };
    checkAuth();

    const interval = setInterval(loadTeamMembers, 5000);
    return () => clearInterval(interval);
  }, [onNavigate]);

  useEffect(() => {
    if (selectedUser && showChat) {
      loadMessages(selectedUser.user_id);
      const interval = setInterval(() => loadMessages(selectedUser.user_id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedUser, showChat]);

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

  const loadMessages = async (otherUserId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);

    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('receiver_id', currentUserId)
      .eq('sender_id', otherUserId)
      .eq('is_read', false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: currentUserId,
        receiver_id: selectedUser.user_id,
        message: newMessage,
        has_attachment: false,
        is_read: false
      });

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    setNewMessage('');
    await loadMessages(selectedUser.user_id);
  };

  const openChat = (user: UserPresence) => {
    setSelectedUser(user);
    setShowChat(true);
  };

  const closeChat = () => {
    setShowChat(false);
    setSelectedUser(null);
    setMessages([]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onNavigate('login');
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

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
          <div
            onClick={() => onNavigate('myTasks')}
            className="px-4 py-3 rounded-2xl text-[#6D6D6D] font-[500] flex items-center gap-3 hover:bg-[#F1F3F7] transition-colors cursor-pointer"
          >
            <CheckSquare size={20} />
            My Tasks
          </div>
          <div className="px-4 py-3 rounded-2xl bg-[#004CFF] text-white font-[600] flex items-center gap-3 cursor-pointer">
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
          <h2 className="text-3xl font-[800] text-[#1A1A1A]">Employees</h2>
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
          {teamMembers.map((member) => (
            <div
              key={member.user_id}
              className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] p-6 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] transition-all"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-[#004CFF] text-white flex items-center justify-center font-[700] text-xl">
                  {getInitials(member.name)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-[700] text-[#1A1A1A]">{member.name}</h3>
                  <p className="text-sm text-[#6D6D6D]">{member.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${member.is_online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <p className="text-xs text-[#6D6D6D]">
                      {member.is_online ? 'Online' : `Last active ${formatLastSeen(member.last_seen)}`}
                    </p>
                  </div>
                </div>
              </div>
              {member.user_id !== currentUserId && (
                <button
                  onClick={() => openChat(member)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#004CFF] text-white rounded-2xl font-[600] text-sm hover:bg-[#0040CC] transition-colors"
                >
                  <MessageCircle size={18} />
                  Chat
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {showChat && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#004CFF] text-white flex items-center justify-center font-[700] text-sm">
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h3 className="text-lg font-[700] text-[#1A1A1A]">{selectedUser.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedUser.is_online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <p className="text-xs text-[#6D6D6D]">
                      {selectedUser.is_online ? 'Online' : `Last active ${formatLastSeen(selectedUser.last_seen)}`}
                    </p>
                  </div>
                </div>
              </div>
              <button onClick={closeChat} className="text-[#6D6D6D] hover:text-[#004CFF] transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <p className="text-center text-[#6D6D6D] text-sm">No messages yet. Start the conversation!</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                        msg.sender_id === currentUserId
                          ? 'bg-[#004CFF] text-white'
                          : 'bg-[#F1F3F7] text-[#1A1A1A]'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.sender_id === currentUserId ? 'text-white opacity-70' : 'text-[#6D6D6D]'}`}>
                        {formatMessageTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#E5E7EB]">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 rounded-2xl border-2 border-[#D0D4DC] focus:outline-none focus:border-[#004CFF] transition-colors text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-6 py-3 bg-[#004CFF] text-white rounded-2xl font-[600] hover:bg-[#0040CC] transition-colors flex items-center gap-2"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
