import { useState, useEffect } from 'react';
import { Bell, Settings, Users, Calendar, CheckSquare, LogOut, Camera, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserSettings {
  notification_task_assigned: boolean;
  notification_task_completed: boolean;
  notification_mentions: boolean;
  notification_chat_messages: boolean;
  sound_notifications: boolean;
  sound_chat: boolean;
  profile_photo_url?: string;
}

interface SettingsPageProps {
  onNavigate: (page: string) => void;
}

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [settings, setSettings] = useState<UserSettings>({
    notification_task_assigned: true,
    notification_task_completed: true,
    notification_mentions: true,
    notification_chat_messages: true,
    sound_notifications: true,
    sound_chat: true
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onNavigate('login');
        return;
      }
      setCurrentUserId(user.id);
      setUserEmail(user.email || '');
      setNewEmail(user.email || '');
      setUserName(user.user_metadata?.name || '');
      setNewName(user.user_metadata?.name || '');
      await loadSettings(user.id);
    };
    checkAuth();
  }, [onNavigate]);

  const loadSettings = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading settings:', error);
      return;
    }

    if (data) {
      setSettings(data);
    } else {
      await supabase.from('user_settings').insert({
        user_id: userId,
        ...settings
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onNavigate('login');
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      email: newEmail,
      data: { name: newName }
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }

    setMessage({ type: 'success', text: 'Profile updated successfully!' });
    setUserName(newName);
    setUserEmail(newEmail);
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match!' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters!' });
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }

    setMessage({ type: 'success', text: 'Password updated successfully!' });
    setNewPassword('');
    setConfirmPassword('');
  };

  const updateSettings = async (key: keyof UserSettings, value: boolean) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: currentUserId,
        ...updatedSettings,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating settings:', error);
      setMessage({ type: 'error', text: 'Failed to update settings' });
    }
  };

  const playTestSound = () => {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
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
          <div className="px-4 py-3 rounded-2xl bg-[#004CFF] text-white font-[600] flex items-center gap-3 cursor-pointer">
            <Settings size={20} />
            Settings
          </div>
        </nav>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-[#E5E7EB] px-8 py-5 flex items-center justify-between">
          <h2 className="text-3xl font-[800] text-[#1A1A1A]">Settings</h2>
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

        <div className="px-8 py-8 space-y-6 overflow-y-auto">
          {message && (
            <div className={`p-4 rounded-2xl ${message.type === 'success' ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
              <p className={`text-sm font-[500] ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {message.text}
              </p>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] p-6">
            <h3 className="text-xl font-[700] text-[#1A1A1A] mb-6">Profile Settings</h3>

            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-full bg-[#004CFF] text-white flex items-center justify-center font-[700] text-3xl">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-[600] text-[#1A1A1A]">{userName}</p>
                <p className="text-sm text-[#6D6D6D]">{userEmail}</p>
              </div>
            </div>

            <form onSubmit={updateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-[600] text-[#1A1A1A] mb-2">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-[#D0D4DC] focus:outline-none focus:border-[#004CFF] transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-[600] text-[#1A1A1A] mb-2">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-[#D0D4DC] focus:outline-none focus:border-[#004CFF] transition-colors text-sm"
                />
              </div>

              <button
                type="submit"
                className="bg-[#004CFF] text-white font-[600] text-base px-9 py-4 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-200 hover:bg-[#0040CC] hover:shadow-[0_12px_32px_rgba(0,76,255,0.2)]"
              >
                Update Profile
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] p-6">
            <h3 className="text-xl font-[700] text-[#1A1A1A] mb-6">Change Password</h3>

            <form onSubmit={updatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-[600] text-[#1A1A1A] mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-[#D0D4DC] focus:outline-none focus:border-[#004CFF] transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-[600] text-[#1A1A1A] mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-[#D0D4DC] focus:outline-none focus:border-[#004CFF] transition-colors text-sm"
                />
              </div>

              <button
                type="submit"
                className="bg-[#004CFF] text-white font-[600] text-base px-9 py-4 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-200 hover:bg-[#0040CC] hover:shadow-[0_12px_32px_rgba(0,76,255,0.2)]"
              >
                Change Password
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] p-6">
            <h3 className="text-xl font-[700] text-[#1A1A1A] mb-6">Notification Settings</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-[#E5E7EB]">
                <div>
                  <p className="text-sm font-[600] text-[#1A1A1A]">Task Assigned</p>
                  <p className="text-xs text-[#6D6D6D]">Get notified when a task is assigned to you</p>
                </div>
                <button
                  onClick={() => updateSettings('notification_task_assigned', !settings.notification_task_assigned)}
                  className={`w-12 h-6 rounded-full transition-colors ${settings.notification_task_assigned ? 'bg-[#004CFF]' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.notification_task_assigned ? 'translate-x-6' : 'translate-x-1'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-[#E5E7EB]">
                <div>
                  <p className="text-sm font-[600] text-[#1A1A1A]">Task Completed</p>
                  <p className="text-xs text-[#6D6D6D]">Get notified when someone completes a task</p>
                </div>
                <button
                  onClick={() => updateSettings('notification_task_completed', !settings.notification_task_completed)}
                  className={`w-12 h-6 rounded-full transition-colors ${settings.notification_task_completed ? 'bg-[#004CFF]' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.notification_task_completed ? 'translate-x-6' : 'translate-x-1'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-[#E5E7EB]">
                <div>
                  <p className="text-sm font-[600] text-[#1A1A1A]">Mentions</p>
                  <p className="text-xs text-[#6D6D6D]">Get notified when someone mentions you</p>
                </div>
                <button
                  onClick={() => updateSettings('notification_mentions', !settings.notification_mentions)}
                  className={`w-12 h-6 rounded-full transition-colors ${settings.notification_mentions ? 'bg-[#004CFF]' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.notification_mentions ? 'translate-x-6' : 'translate-x-1'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-[600] text-[#1A1A1A]">Chat Messages</p>
                  <p className="text-xs text-[#6D6D6D]">Get notified when you receive a chat message</p>
                </div>
                <button
                  onClick={() => updateSettings('notification_chat_messages', !settings.notification_chat_messages)}
                  className={`w-12 h-6 rounded-full transition-colors ${settings.notification_chat_messages ? 'bg-[#004CFF]' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.notification_chat_messages ? 'translate-x-6' : 'translate-x-1'}`}></div>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] p-6">
            <h3 className="text-xl font-[700] text-[#1A1A1A] mb-6">Sound Settings</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-[#E5E7EB]">
                <div>
                  <p className="text-sm font-[600] text-[#1A1A1A]">Notification Sounds</p>
                  <p className="text-xs text-[#6D6D6D]">Play sound for notifications</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={playTestSound}
                    className="p-2 rounded-xl hover:bg-[#F1F3F7] transition-colors"
                  >
                    {settings.sound_notifications ? <Volume2 size={20} className="text-[#004CFF]" /> : <VolumeX size={20} className="text-[#6D6D6D]" />}
                  </button>
                  <button
                    onClick={() => updateSettings('sound_notifications', !settings.sound_notifications)}
                    className={`w-12 h-6 rounded-full transition-colors ${settings.sound_notifications ? 'bg-[#004CFF]' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.sound_notifications ? 'translate-x-6' : 'translate-x-1'}`}></div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-[600] text-[#1A1A1A]">Chat Sounds</p>
                  <p className="text-xs text-[#6D6D6D]">Play sound for chat messages</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={playTestSound}
                    className="p-2 rounded-xl hover:bg-[#F1F3F7] transition-colors"
                  >
                    {settings.sound_chat ? <Volume2 size={20} className="text-[#004CFF]" /> : <VolumeX size={20} className="text-[#6D6D6D]" />}
                  </button>
                  <button
                    onClick={() => updateSettings('sound_chat', !settings.sound_chat)}
                    className={`w-12 h-6 rounded-full transition-colors ${settings.sound_chat ? 'bg-[#004CFF]' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.sound_chat ? 'translate-x-6' : 'translate-x-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
