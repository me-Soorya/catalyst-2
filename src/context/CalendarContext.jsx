import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchUpcomingEvents, createCalendarEvent, deleteCalendarEvent, findMatchingCalendarEvent } from '../services/googleCalendar';

const CalendarContext = createContext();

export const CalendarProvider = ({ children }) => {
  const { accessToken } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error'|'info' }

  // Helper to trigger toast
  const showToast = (message, type = 'info') => {
    setToast({ id: Date.now(), message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  // Load events from Google Calendar API
  const loadEvents = useCallback(async () => {
    if (!accessToken) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const liveEvents = await fetchUpcomingEvents(accessToken);
      setEvents(liveEvents);
      showToast(`Fetched ${liveEvents.length} events from Google Calendar`, 'success');
    } catch (err) {
      console.error('Failed to load Google Calendar events:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to connect to Google Calendar API');
      showToast('Failed to load Google Calendar events', 'error');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Initial load when auth changes
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const isExistingCalendarEvent = (eventData) => {
    return findMatchingCalendarEvent(events, eventData.title, eventData.startDateTime);
  };

  const addEvent = async (eventData) => {
    if (!accessToken) {
      showToast('Account is not connected. Please connect your Google Account.', 'error');
      throw new Error('Account is not connected');
    }

    const existingEvent = isExistingCalendarEvent(eventData);
    if (existingEvent) {
      showToast('This event already exists in Google Calendar.', 'info');
      return existingEvent;
    }

    setLoading(true);
    try {
      const createdEvent = await createCalendarEvent(accessToken, eventData);
      showToast('Study session created on Google Calendar!', 'success');
      await loadEvents();
      return createdEvent;
    } catch (err) {
      console.error('Error creating event:', err);
      showToast('Failed to create event: ' + (err.response?.data?.error?.message || err.message), 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const ensureCalendarEventExists = async (eventData, options = { silent: false }) => {
    if (!accessToken) {
      if (!options.silent) showToast('Account is not connected. Please connect your Google Account.', 'error');
      throw new Error('Account is not connected');
    }

    const existingEvent = isExistingCalendarEvent(eventData);
    if (existingEvent) return existingEvent;

    setLoading(true);
    try {
      const createdEvent = await createCalendarEvent(accessToken, eventData);
      if (!options.silent) showToast('Created calendar event for formal assignment.', 'success');
      await loadEvents();
      return createdEvent;
    } catch (err) {
      console.error('Error auto-syncing calendar event:', err);
      if (!options.silent) showToast('Failed to auto-sync calendar event: ' + (err.response?.data?.error?.message || err.message), 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove event
  const removeEvent = async (eventId) => {
    if (!accessToken) {
      showToast('Account is not connected. Please connect your Google Account.', 'error');
      return;
    }

    try {
      await deleteCalendarEvent(accessToken, eventId);
      showToast('Event removed from Google Calendar', 'success');
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      showToast('Failed to remove event: ' + err.message, 'error');
    }
  };

  return (
    <CalendarContext.Provider
      value={{
        events,
        loading,
        error,
        toast,
        loadEvents,
        addEvent,
        removeEvent,
        ensureCalendarEventExists,
        showToast,
        hideToast,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};

