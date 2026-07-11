import React, { useState } from 'react';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  Target,
  Users,
  Building,
  Star,
  Flag,
  Zap,
  Circle,
  Activity,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type: 'project' | 'wbs' | 'milestone' | 'task-start' | 'task-end' | 'ongoing' | 'critical';
  isOverdue?: boolean;
  // Additional risk-specific data
  status?: string;
  category?: string;
  impact?: string;
  probability?: string;
  riskScore?: number;
  riskLevel?: string;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const ProjectCalendarView: React.FC<CalendarViewProps> = ({ 
  events = [], 
  onDateSelect, 
  onEventClick 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const renderCalendarView = () => {
    const today = new Date();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const calendarDays = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="h-24 p-1"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Helper function to normalize dates to local date (ignoring time)
      const normalizeToDate = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      };

      // Get different types of events for this day
      const dayEvents = events.filter(event => {
        const eventStart = normalizeToDate(new Date(event.startDate));
        const eventEnd = normalizeToDate(new Date(event.endDate));
        const normalizedCurrentDate = normalizeToDate(currentDate);
        return normalizedCurrentDate >= eventStart && normalizedCurrentDate <= eventEnd;
      });

      const projectEvents = dayEvents.filter(event => event.type === 'project');
      const wbsEvents = dayEvents.filter(event => event.type === 'wbs');
      const milestoneEvents = dayEvents.filter(event => event.type === 'milestone');
      const taskStartEvents = dayEvents.filter(event => event.type === 'task-start');
      const taskEndEvents = dayEvents.filter(event => event.type === 'task-end');
      const criticalEvents = dayEvents.filter(event => event.type === 'critical');
      const ongoingEvents = dayEvents.filter(event => event.type === 'ongoing');
      const overdueEvents = dayEvents.filter(event => event.isOverdue);

      const isToday = currentDate.toDateString() === today.toDateString();
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

      // Determine day styling based on content (priority order)
      let dayBgClass = '';
      if (isToday) {
        dayBgClass = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700';
      } else if (projectEvents.length > 0) {
        dayBgClass = 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700';
      } else if (milestoneEvents.length > 0) {
        dayBgClass = 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700';
      } else if (wbsEvents.length > 0) {
        dayBgClass = 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700';
      } else if (overdueEvents.length > 0) {
        dayBgClass = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
      } else if (criticalEvents.length > 0) {
        dayBgClass = 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700';
      } else if (isWeekend) {
        dayBgClass = 'bg-gray-50 dark:bg-gray-900/50';
      }

      calendarDays.push(
        <div 
          key={day} 
          className={`h-32 p-1 border border-gray-200 dark:border-gray-700 ${dayBgClass} ${
            dayEvents.length > 0 ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
          } transition-all`}
          onClick={() => {
            if (dayEvents.length > 0) {
              setSelectedDayEvents(dayEvents);
              setSelectedDate(currentDate);
              setShowMoreModal(true);
            } else if (onDateSelect) {
              onDateSelect(currentDate);
            }
          }}
        >
          <div className={`text-sm font-medium mb-1 flex items-center justify-between ${
            isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
          }`}>
            <span>{day}</span>
            <div className="flex items-center space-x-1">
              {projectEvents.length > 0 && <Building size={8} className="text-indigo-500" />}
              {wbsEvents.length > 0 && <Target size={8} className="text-teal-500" />}
              {milestoneEvents.length > 0 && <Star size={8} className="text-purple-500" />}
              {criticalEvents.length > 0 && <Zap size={8} className="text-orange-500" />}
              {overdueEvents.length > 0 && <AlertTriangle size={8} className="text-red-500" />}
            </div>
          </div>
          
          <div className="space-y-1 text-xs overflow-y-auto max-h-24 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {(() => {
              // Show all events now that we have scroll
              let usedSlots = 0;
              const maxSlots = 999; // No limit since we have scroll

              // Project events (highest priority)
              const projectEventElements = projectEvents.slice(0, Math.max(0, maxSlots - usedSlots)).map(event => (
                <div
                  key={`project-${event.id}`}
                  className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 p-1 rounded truncate flex items-center"
                  title={event.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick && onEventClick(event);
                  }}
                >
                  <Building size={8} className="mr-1 flex-shrink-0" />
                  <span className="truncate">{event.title}</span>
                </div>
              ));
              usedSlots += projectEventElements.length;

              // WBS events
              const wbsEventElements = wbsEvents.slice(0, Math.max(0, maxSlots - usedSlots)).map(event => (
                <div
                  key={`wbs-${event.id}`}
                  className="bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200 p-1 rounded truncate flex items-center"
                  title={event.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick && onEventClick(event);
                  }}
                >
                  <Target size={8} className="mr-1 flex-shrink-0" />
                  <span className="truncate">{event.title}</span>
                </div>
              ));
              usedSlots += wbsEventElements.length;

              // Milestones
              const milestoneEventElements = milestoneEvents.slice(0, Math.max(0, maxSlots - usedSlots)).map(event => (
                <div
                  key={`milestone-${event.id}`}
                  className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 p-1 rounded truncate flex items-center"
                  title={event.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick && onEventClick(event);
                  }}
                >
                  <Flag size={8} className="mr-1 flex-shrink-0" />
                  <span className="truncate">{event.title}</span>
                </div>
              ));
              usedSlots += milestoneEventElements.length;

              // Task starts
              const taskStartEventElements = taskStartEvents.slice(0, Math.max(0, maxSlots - usedSlots)).map(event => (
                <div
                  key={`start-${event.id}`}
                  className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 p-1 rounded truncate flex items-center"
                  title={`Starting: ${event.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick && onEventClick(event);
                  }}
                >
                  <Activity size={8} className="mr-1 flex-shrink-0" />
                  <span className="truncate">{event.title}</span>
                </div>
              ));
              usedSlots += taskStartEventElements.length;

              // Task ends
              const taskEndEventElements = taskEndEvents.slice(0, Math.max(0, maxSlots - usedSlots)).map(event => (
                <div
                  key={`end-${event.id}`}
                  className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 p-1 rounded truncate flex items-center"
                  title={`Ending: ${event.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick && onEventClick(event);
                  }}
                >
                  <CheckCircle size={8} className="mr-1 flex-shrink-0" />
                  <span className="truncate">{event.title}</span>
                </div>
              ));
              usedSlots += taskEndEventElements.length;

              // Ongoing tasks
              const ongoingEventElements = ongoingEvents.slice(0, Math.max(0, maxSlots - usedSlots)).map(event => (
                <div
                  key={`ongoing-${event.id}`}
                  className={`p-1 rounded truncate flex items-center ${
                    event.type === 'critical' 
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                  title={`Ongoing: ${event.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick && onEventClick(event);
                  }}
                >
                  <Clock size={8} className="mr-1 flex-shrink-0" />
                  <span className="truncate">{event.title}</span>
                </div>
              ));
              usedSlots += ongoingEventElements.length;

              // Calculate total events to show
              const totalEvents = projectEventElements.length + wbsEventElements.length + 
                                milestoneEventElements.length + taskStartEventElements.length + 
                                taskEndEventElements.length + ongoingEventElements.length;
              const remainingEvents = dayEvents.length - totalEvents;

              return (
                <>
                  {projectEventElements}
                  {wbsEventElements}
                  {milestoneEventElements}
                  {taskStartEventElements}
                  {taskEndEventElements}
                  {ongoingEventElements}
                  {remainingEvents > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDayEvents(dayEvents);
                        setSelectedDate(currentDate);
                        setShowMoreModal(true);
                      }}
                      className="text-blue-600 dark:text-blue-400 text-center hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer text-xs mt-1 w-full"
                    >
                      +{remainingEvents} more
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentMonth(new Date(year, month - 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => setCurrentMonth(new Date(year, month + 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays}
        </div>

        {/* Calendar Legend */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Calendar Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <Building size={12} className="text-indigo-500" />
              <span className="text-gray-700 dark:text-gray-300">Project Events</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target size={12} className="text-teal-500" />
              <span className="text-gray-700 dark:text-gray-300">WBS Events</span>
            </div>
            <div className="flex items-center space-x-2">
              <Flag size={12} className="text-purple-500" />
              <span className="text-gray-700 dark:text-gray-300">Milestones</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity size={12} className="text-green-500" />
              <span className="text-gray-700 dark:text-gray-300">Task Starts</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle size={12} className="text-blue-500" />
              <span className="text-gray-700 dark:text-gray-300">Task Ends</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock size={12} className="text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">Ongoing</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap size={12} className="text-orange-500" />
              <span className="text-gray-700 dark:text-gray-300">Critical Path</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle size={12} className="text-red-500" />
              <span className="text-gray-700 dark:text-gray-300">Overdue</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-100 rounded border"></div>
              <span className="text-gray-700 dark:text-gray-300">Today</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-100 rounded border"></div>
              <span className="text-gray-700 dark:text-gray-300">Weekend</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getEventIcon = (event: CalendarEvent) => {
    switch (event.type) {
      case 'project': return <Building size={14} className="text-indigo-500" />;
      case 'wbs': return <Target size={14} className="text-teal-500" />;
      case 'milestone': return <Flag size={14} className="text-purple-500" />;
      case 'task-start': return <Activity size={14} className="text-green-500" />;
      case 'task-end': return <CheckCircle size={14} className="text-blue-500" />;
      case 'ongoing': return <Clock size={14} className="text-gray-500" />;
      case 'critical': return <Zap size={14} className="text-orange-500" />;
      default: return <Circle size={14} />;
    }
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.isOverdue) return 'text-red-600 dark:text-red-400';
    switch (event.type) {
      case 'project': return 'text-indigo-600 dark:text-indigo-400';
      case 'wbs': return 'text-teal-600 dark:text-teal-400';
      case 'milestone': return 'text-purple-600 dark:text-purple-400';
      case 'task-start': return 'text-green-600 dark:text-green-400';
      case 'task-end': return 'text-blue-600 dark:text-blue-400';
      case 'ongoing': return 'text-gray-600 dark:text-gray-400';
      case 'critical': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <>
      {renderCalendarView()}
      
      {/* Modal for showing all events */}
      <Dialog open={showMoreModal} onOpenChange={setShowMoreModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Events on {selectedDate?.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {selectedDayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => {
                  if (onEventClick) {
                    onEventClick(event);
                    setShowMoreModal(false);
                  }
                }}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  event.isOverdue 
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {getEventIcon(event)}
                    {event.isOverdue && <AlertTriangle size={14} className="text-red-500 mt-1" />}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium ${getEventColor(event)}`}>
                      {event.title}
                      {event.isOverdue && <span className="ml-2 text-xs text-red-600 dark:text-red-400">(Overdue)</span>}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                      {event.type.replace('-', ' ')}
                    </p>
                    {/* Show risk-specific information */}
                    {(event.status || event.category || event.impact || event.probability || event.riskScore !== undefined) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {event.status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            event.status.toLowerCase() === 'open' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            event.status.toLowerCase() === 'closed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {event.status}
                          </span>
                        )}
                        {event.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            {event.category}
                          </span>
                        )}
                        {event.impact && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            event.impact.toLowerCase() === 'high' || event.impact.toLowerCase() === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            event.impact.toLowerCase() === 'medium' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                          }`}>
                            Impact: {event.impact}
                          </span>
                        )}
                        {event.probability && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            event.probability.toLowerCase() === 'high' || event.probability.toLowerCase() === 'very high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            event.probability.toLowerCase() === 'medium' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                          }`}>
                            Probability: {event.probability}
                          </span>
                        )}
                        {event.riskScore !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            event.riskScore >= 15 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            event.riskScore >= 8 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          }`}>
                            Score: {event.riskScore}
                          </span>
                        )}
                        {event.riskLevel && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            event.riskLevel.toLowerCase() === 'high' || event.riskLevel.toLowerCase() === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            event.riskLevel.toLowerCase() === 'medium' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          }`}>
                            {event.riskLevel}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {selectedDayEvents.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No events on this day
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProjectCalendarView;

// Example usage:
/*
import ProjectCalendarView from './calendar-component';

const MyComponent = () => {
  const events = [
    {
      id: '1',
      title: 'Project Start',
      startDate: '2023-05-01',
      endDate: '2023-05-01',
      type: 'project'
    },
    {
      id: '2',
      title: 'Foundation Phase',
      startDate: '2023-05-05',
      endDate: '2023-05-15',
      type: 'wbs'
    },
    {
      id: '3',
      title: 'Design Approval',
      startDate: '2023-05-10',
      endDate: '2023-05-10',
      type: 'milestone'
    },
    {
      id: '4',
      title: 'Create Wireframes',
      startDate: '2023-05-07',
      endDate: '2023-05-07',
      type: 'task-start'
    },
    {
      id: '5',
      title: 'Finish Wireframes',
      startDate: '2023-05-12',
      endDate: '2023-05-12',
      type: 'task-end'
    },
    {
      id: '6',
      title: 'Development',
      startDate: '2023-05-08',
      endDate: '2023-05-20',
      type: 'ongoing'
    },
    {
      id: '7',
      title: 'Critical Bug Fix',
      startDate: '2023-05-18',
      endDate: '2023-05-19',
      type: 'critical'
    },
    {
      id: '8',
      title: 'Late Delivery',
      startDate: '2023-05-15',
      endDate: '2023-05-16',
      type: 'task-end',
      isOverdue: true
    }
  ];

  const handleDateSelect = (date) => {
    console.log('Selected date:', date);
  };

  const handleEventClick = (event) => {
    console.log('Clicked event:', event);
  };

  return (
    <ProjectCalendarView 
      events={events}
      onDateSelect={handleDateSelect}
      onEventClick={handleEventClick}
    />
  );
};
*/ 