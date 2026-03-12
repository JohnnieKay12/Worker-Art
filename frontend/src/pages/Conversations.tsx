import React from 'react';

const Conversations: React.FC = () => {
  const conversations = [
    {
      id: 1,
      name: 'Sarah Johnson',
      role: 'Plumber',
      lastMessage: 'I can come by tomorrow at 2 PM. Does that work for you?',
      time: '2 min ago',
      unread: true,
    },
    {
      id: 2,
      name: 'Mike Chen',
      role: 'Electrician',
      lastMessage: 'The repair is complete. Let me know if you need anything else!',
      time: '1 hour ago',
      unread: false,
    },
    {
      id: 3,
      name: 'Emily Davis',
      role: 'House Cleaner',
      lastMessage: 'Thanks for booking with me. See you on Friday!',
      time: 'Yesterday',
      unread: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Messages</h1>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No conversations yet.</p>
              <p className="text-sm mt-1">Start chatting with artisans!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-semibold">
                        {conversation.name.charAt(0)}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.name}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {conversation.time}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-1">{conversation.role}</p>
                      
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${conversation.unread ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                          {conversation.lastMessage}
                        </p>
                        {conversation.unread && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Conversations;
