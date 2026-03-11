import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay, isBefore, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FamilyEvent {
  id: string;
  title: string;
  event_date: string;
  type: 'birthday' | 'anniversary' | 'travel';
  created_at: string;
}

const EVENT_COLORS: Record<string, string> = {
  birthday: 'bg-kids-accent',
  anniversary: 'bg-arena-accent',
  travel: 'bg-green-500',
};

const EVENT_EMOJI: Record<string, string> = {
  birthday: '🎂',
  anniversary: '💍',
  travel: '✈️',
};

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function FamilyCalendar() {
  const { user, family } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Add event form
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState<'birthday' | 'anniversary' | 'travel'>('birthday');
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!family?.id) return;
    const { data } = await supabase
      .from('family_events')
      .select('id, title, event_date, type, created_at')
      .eq('family_id', family.id)
      .order('event_date', { ascending: true });
    setEvents(data ?? []);
    setLoading(false);
  }, [family?.id]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  const isRecurring = (type: string) => type === 'birthday' || type === 'anniversary';

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const monthDay = format(date, 'MM-dd');
    return events.filter(e => {
      if (isRecurring(e.type)) {
        return e.event_date.slice(5) === monthDay; // match MM-dd across any year
      }
      return e.event_date === dateStr;
    });
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const currentYear = today.getFullYear();

    return events
      .map(e => {
        if (isRecurring(e.type)) {
          // Project to current or next year
          const thisYear = `${currentYear}-${e.event_date.slice(5)}`;
          const nextYear = `${currentYear + 1}-${e.event_date.slice(5)}`;
          const projected = thisYear >= todayStr ? thisYear : nextYear;
          return { ...e, event_date: projected };
        }
        return e;
      })
      .filter(e => e.event_date >= todayStr)
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  };

  const upcomingEvents = getUpcomingEvents();

  const handleAddEvent = async () => {
    if (!newTitle.trim() || !newDate || !family) return;
    setSaving(true);
    const { error } = await supabase.from('family_events').insert({
      family_id: family.id,
      title: newTitle.trim(),
      event_date: newDate,
      type: newType,
    });
    if (error) { toast.error('Failed to add event'); setSaving(false); return; }
    toast.success('Event added! 🎉');
    setShowAdd(false);
    setNewTitle('');
    setNewDate('');
    setNewType('birthday');
    setSaving(false);
    fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from('family_events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
    toast.success('Event removed');
  };

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    if (selectedDate === dateStr) {
      setSelectedDate(null);
    } else {
      setSelectedDate(dateStr);
    }
  };

  const selectedDayEvents = selectedDate
    ? events.filter(e => {
        if (isRecurring(e.type)) {
          return e.event_date.slice(5) === selectedDate.slice(5);
        }
        return e.event_date === selectedDate;
      })
    : [];

  return (
    <div className="flex-1 overflow-y-auto min-h-[calc(100vh-7.5rem)]">
      <div className="p-4 space-y-4">
        {/* Month Nav + Add */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2">
            <ChevronLeft size={20} className="text-foreground" />
          </button>
          <h2 className="font-display font-bold text-lg text-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2">
              <ChevronRight size={20} className="text-foreground" />
            </button>
            <button
              onClick={() => { setShowAdd(true); setNewDate(format(new Date(), 'yyyy-MM-dd')); }}
              className="p-1.5 bg-primary rounded-full"
            >
              <Plus size={16} className="text-primary-foreground" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-display font-semibold text-muted-foreground py-2">
              {d}
            </div>
          ))}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map(day => {
            const dayEvents = getEventsForDate(day);
            const today = isToday(day);
            const dateStr = format(day, 'yyyy-MM-dd');
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-body relative transition-colors ${
                  today ? 'bg-primary text-primary-foreground font-bold' :
                  isSelected ? 'bg-accent ring-2 ring-primary' :
                  'text-foreground hover:bg-accent/50'
                } ${!isSameMonth(day, currentMonth) ? 'opacity-30' : ''}`}
              >
                {format(day, 'd')}
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.map((e, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[e.type]}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day Events */}
        {selectedDate && (
          <div className="space-y-2">
            <h3 className="font-display font-semibold text-sm text-foreground">
              {format(parseISO(selectedDate), 'EEEE, MMM d')}
            </h3>
            {selectedDayEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground font-body">No events on this day</p>
            ) : (
              selectedDayEvents.map(event => (
                <div key={event.id} className="flex items-center gap-3 bg-popover rounded-lg p-3 border border-border">
                  <span className="text-lg">{EVENT_EMOJI[event.type]}</span>
                  <div className="flex-1">
                    <p className="font-body font-semibold text-sm text-foreground">{event.title}</p>
                    <p className="font-body text-xs text-muted-foreground capitalize">{event.type}</p>
                  </div>
                  <button onClick={() => deleteEvent(event.id)} className="p-1 text-muted-foreground">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 justify-center">
          {[
            { label: 'Birthday', color: 'bg-kids-accent' },
            { label: 'Anniversary', color: 'bg-arena-accent' },
            { label: 'Travel', color: 'bg-green-500' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
              <span className="text-xs font-body text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>

        {/* Upcoming Events */}
        <div className="space-y-2">
          <h3 className="font-display font-bold text-foreground">Upcoming</h3>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground font-body py-4">No upcoming events</p>
          ) : (
            upcomingEvents.slice(0, 5).map(event => (
              <div key={event.id} className="flex items-center gap-3 bg-popover rounded-lg p-3 border border-border">
                <span className="text-lg">{EVENT_EMOJI[event.type]}</span>
                <div className="flex-1">
                  <p className="font-body font-semibold text-sm text-foreground">{event.title}</p>
                  <p className="font-body text-xs text-muted-foreground">
                    {format(parseISO(event.event_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <button onClick={() => deleteEvent(event.id)} className="p-1 text-muted-foreground">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] flex flex-col">
          <div className="flex-1 bg-black/40" onClick={() => setShowAdd(false)} />
          <div className="bg-popover w-full rounded-t-2xl p-5 pb-8 space-y-4 border-t border-border shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-foreground">Add Event</h2>
              <button onClick={() => setShowAdd(false)} className="p-1">
                <X size={20} className="text-foreground" />
              </button>
            </div>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Event name..."
              autoFocus
              className="w-full p-3 rounded-xl bg-muted border border-border font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-full p-3 rounded-xl bg-muted border border-border font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex gap-2">
              {(['birthday', 'anniversary', 'travel'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-display font-semibold capitalize transition-colors ${
                    newType === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {EVENT_EMOJI[t]} {t}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddEvent}
              disabled={!newTitle.trim() || !newDate || saving}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-display font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {saving ? 'Saving...' : 'Add Event'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
