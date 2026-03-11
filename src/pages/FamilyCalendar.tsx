import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay } from 'date-fns';

const SAMPLE_EVENTS = [
  { date: '2026-03-15', title: "Dadi's Birthday", type: 'birthday' as const },
  { date: '2026-03-28', title: '25th Anniversary', type: 'anniversary' as const },
  { date: '2026-04-10', title: 'Goa Trip', type: 'travel' as const },
];

const EVENT_COLORS: Record<string, string> = {
  birthday: 'bg-kids-accent',
  anniversary: 'bg-arena-accent',
  travel: 'bg-green-500',
};

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function FamilyCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return SAMPLE_EVENTS.filter(e => e.date === dateStr);
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-[calc(100vh-7.5rem)]">
      <div className="p-4 space-y-4">
        {/* Month Nav */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2">
            <ChevronLeft size={20} className="text-foreground" />
          </button>
          <h2 className="font-display font-bold text-lg text-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2">
            <ChevronRight size={20} className="text-foreground" />
          </button>
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
            const events = getEventsForDate(day);
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-body relative ${
                  today ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground'
                } ${!isSameMonth(day, currentMonth) ? 'opacity-30' : ''}`}
              >
                {format(day, 'd')}
                {events.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {events.map((e, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[e.type]}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

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
          {SAMPLE_EVENTS.map((event, i) => (
            <div key={i} className="flex items-center gap-3 bg-popover rounded-lg p-3 border border-border">
              <div className={`w-3 h-3 rounded-full ${EVENT_COLORS[event.type]}`} />
              <div className="flex-1">
                <p className="font-body font-semibold text-sm text-foreground">{event.title}</p>
                <p className="font-body text-xs text-muted-foreground">{event.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
