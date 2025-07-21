import React, { useState, useEffect } from 'react';

const Notifications = ({ notifications }) => {
  const [visibleNotifications, setVisibleNotifications] = useState([]);
  
  useEffect(() => {
    // When a new notification comes in, add it to visible notifications
    if (notifications.length > 0) {
      const latestNotification = notifications[notifications.length - 1];
      
      // Create notification with unique ID
      const notification = {
        id: Date.now(),
        message: latestNotification,
        timestamp: new Date()
      };
      
      setVisibleNotifications(prev => [...prev, notification]);
      
      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        setVisibleNotifications(prev => 
          prev.filter(item => item.id !== notification.id)
        );
      }, 5000);
    }
  }, [notifications]);
  
  // Manually dismiss a notification
  const dismissNotification = (id) => {
    setVisibleNotifications(prev => 
      prev.filter(item => item.id !== id)
    );
  };
  
  if (visibleNotifications.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {visibleNotifications.map(notification => (
        <div 
          key={notification.id}
          className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-green-500 w-72 transform transition-transform duration-300 ease-in-out"
        >
          <div className="flex justify-between">
            <div className="text-sm font-medium text-green-800">Value Bet Alert</div>
            <button 
              onClick={() => dismissNotification(notification.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          <p className="text-xs text-gray-400 mt-1">
            {notification.timestamp.toLocaleTimeString()}
          </p>
        </div>
      ))}
    </div>
  );
};

export default Notifications; 