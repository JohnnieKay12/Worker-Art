import React, { useState } from 'react';

const ConversationDetail: React.FC = () => {
  const [message, setMessage] = useState('');

  const messages = [
    {
      id: 1,
      sender: 'them',
      text: 'Hi! I saw your request for plumbing services. I\'m available this week.',
      time: '10:30 AM',
    },
    {
      id: 2,
      sender: 'me',
      text: 'Great! I need help fixing a leaky faucet in my kitchen.',
      time: '10:32 AM',
    },
    {
      id: 3,
      sender: 'them',
      text: 'That sounds like a quick fix. I can come by tomorrow at 2 PM. Does that work for you?',
      time: '10:35 AM',
    },
  ];

  const handleSend = () => {
    if (message.trim()) {
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button className="text-gray-600 hover:text-gray-900">
            ← Back
          </button>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold">S</span>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Sarah Johnson</h2>
            <p className="text-xs text-green-600">Online</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                  msg.sender === 'me'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white text-gray-900 rounded-bl-none shadow-sm'
                }`}
              >
                <p>{msg.text}</p>
                <span
                  className={`text-xs mt-1 block ${
                    msg.sender === 'me' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {msg.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationDetail;
