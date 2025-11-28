import { useState, useEffect } from 'react';
import { Bell, Settings, Users, Calendar, CheckSquare, LogOut, ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  event_type: 'Meeting' | 'Leave' | 'Personal';
  event_date: string;
  meeting_link?: string;
  notes?: string;
  created_at: string;
}

interface CalendarPageProps {
  onNavigate: (page: string) => void;
}

export function CalendarPage({ onNavigate }: CalendarPageProps) {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    event_type: 'Meeting' as 'Meeting' | 'Leave' | 'Personal',
    meeting_link: '',
    notes: ''
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onNavigate('login');
        return;
      }
      setCurrentUserId(user.id);
      await loadEvents();
    };
    checkAuth();
  }, [onNavigate]);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error loading events:', error);
      return;
    }

    setEvents(data || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onNavigate('login');
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const openDateModal = (day: number) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(selected);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    setNewEvent({ title: '', event_type: 'Meeting', meeting_link: '', notes: '' });
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !newEvent.title) return;

    const { error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: currentUserId,
        title: newEvent.title,
        event_type: newEvent.event_type,
        event_date: selectedDate.toISOString().split('T')[0],
        meeting_link: newEvent.meeting_link || null,
        notes: newEvent.notes || null
      });

    if (error) {
      console.error('Error creating event:', error);
      return;
    }

    await loadEvents();
    closeModal();
  };

  const getEventsForDate = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString()
      .split('T')[0];
    return events.filter(e => e.event_date === dateStr);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'Meeting':
        return 'bg-[#004CFF]';
      case 'Leave':
        return 'bg-[#FF3B3B]';
      case 'Personal':
        return 'bg-[#FF8A34]';
      default:
        return 'bg-gray-500';
    }
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
          <div className="px-4 py-3 rounded-2xl bg-[#004CFF] text-white font-[600] flex items-center gap-3 cursor-pointer">
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
          <h2 className="text-3xl font-[800] text-[#1A1A1A]">Calendar</h2>
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

        <div className="px-8 py-8">
          <div className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-[800] text-[#1A1A1A]">{monthName}</h3>
              <div className="flex gap-3">
                <button
                  onClick={previousMonth}
                  className="p-2 rounded-xl hover:bg-[#F1F3F7] transition-colors"
                >
                  <ChevronLeft size={24} className="text-[#6D6D6D]" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-xl hover:bg-[#F1F3F7] transition-colors"
                >
                  <ChevronRight size={24} className="text-[#6D6D6D]" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {dayNames.map((day) => (
                <div key={day} className="text-center font-[700] text-[#6D6D6D] text-sm py-2">
                  {day}
                </div>
              ))}

              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square"></div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const dayEvents = getEventsForDate(day);
                const isToday =
                  day === new Date().getDate() &&
                  currentDate.getMonth() === new Date().getMonth() &&
                  currentDate.getFullYear() === new Date().getFullYear();

                return (
                  <div
                    key={day}
                    onClick={() => openDateModal(day)}
                    className={`aspect-square p-2 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                      isToday ? 'border-[#004CFF] bg-blue-50' : 'border-[#E5E7EB] hover:border-[#004CFF]'
                    }`}
                  >
                    <div className="text-sm font-[600] text-[#1A1A1A] mb-1">{day}</div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={`text-xs px-2 py-1 rounded text-white truncate ${getEventTypeColor(event.event_type)}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-[#6D6D6D] px-2">+{dayEvents.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#004CFF]"></div>
                <span className="text-sm text-[#6D6D6D]">Meeting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#FF3B3B]"></div>
                <span className="text-sm text-[#6D6D6D]">Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#FF8A34]"></div>
                <span className="text-sm text-[#6D6D6D]">Personal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-8" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-[800] text-[#1A1A1A]">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <button onClick={closeModal} className="text-[#6D6D6D] hover:text-[#004CFF] transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-[700] text-[#1A1A1A] mb-3">Events on this day:</h4>
              {getEventsForDate(selectedDate.getDate()).length === 0 ? (
                <p className="text-sm text-[#6D6D6D]">No events</p>
              ) : (
                <div className="space-y-2">
                  {getEventsForDate(selectedDate.getDate()).map((event) => (
                    <div key={event.id} className="p-3 bg-[#F1F3F7] rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded ${getEventTypeColor(event.event_type)}`}></div>
                        <span className="font-[600] text-sm text-[#1A1A1A]">{event.title}</span>
                      </div>
                      {event.meeting_link && (
                        <a
                          href={event.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#004CFF] hover:underline"
                        >
                          Join Meeting
                        </a>
                      )}
                      {event.notes && <p className="text-xs text-[#6D6D6D] mt-1">{event.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddEvent} className="space-y-4">
              <h4 className="text-sm font-[700] text-[#1A1A1A]">Add New Event</h4>

              <input
                type="text"
                placeholder="Event title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-[#D0D4DC] focus:outline-none focus:border-[#004CFF] transition-colors text-sm"
                required
              />

              <select
                value={newEvent.event_type}
                onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value as 'Meeting' | 'Leave' | 'Personal' })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-[#D0D4DC] focus:outline-none focus:border-[#004CFF] transition-colors text-sm"
              >
                <option value="Meeting">Meeting</option>
                <option value="Leave">Leave</option>
                <option value="Personal">Personal</option>
              </select>

              {newEvent.event_type === 'Meeting' && (
                <input
                  type="url"
                  placeholder="Meeting link (optional)"
                  value={newEvent.meeting_link}
                  onChange={(e) => setNewEvent({ ...newEvent, meeting_link: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-[#D0D4DC] focus:outline-none focus:border-[#004CFF] transition-colors text-sm"
                />
              )}

              <textarea
                placeholder="Notes (optional)"
                value={newEvent.notes}
                onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-[#D0D4DC] focus:outline-none focus:border-[#004CFF] transition-colors text-sm resize-none h-20"
              />

              <button
                type="submit"
                className="w-full bg-[#004CFF] text-white font-[600] text-base px-9 py-4 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-200 hover:bg-[#0040CC] hover:shadow-[0_12px_32px_rgba(0,76,255,0.2)]"
              >
                Add Event
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
