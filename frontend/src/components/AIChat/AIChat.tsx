import React, { useState, useEffect, useRef } from 'react';
import { aiService } from '../../services/aiService';
import { Dataset } from '../../types';
import './AIChat.css';
import { ChevronDown, LucideClockFading, Send, Zap } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  datasets?: Dataset[];
  onActionSelect?: (action: any) => void;
  className?: string;
}

const AIChat: React.FC<AIChatProps> = ({
  datasets = [],
  onActionSelect,
  className = ''
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'ai',
        content: 'Hi! I\'m your AI assistant. I can help you analyze data, create visualizations, and answer questions about your datasets. Try asking me something like "Show me a bar chart of sales by region" or "What are the trends in my data?"',
        timestamp: new Date()
      }]);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call the backend AI service
      const response = await aiService.chatCompletion(userMessage.content, {
        datasets: datasets
      });
      
      // Debug: Log the response structure
      console.log('AI Response structure:', response);
      
      // Safely extract the response content as a string
      let responseContent = 'I apologize, but I couldn\'t generate a response. Please try again.';
      
      if (response && response.data) {
        if (typeof response.data.response === 'string') {
          responseContent = response.data.response;
        } else if (typeof response.data === 'string') {
          responseContent = response.data;
        } else if (response.response && typeof response.response === 'string') {
          responseContent = response.response;
        }
      }
      
      // Format the response to look like normal human text
      const formattedContent = formatAIResponse(responseContent);
      
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: formattedContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Service Error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        content: 'I\'m sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: any) => {
    if (onActionSelect) {
      onActionSelect(action);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatAIResponse = (response: string): string => {
    return response
      // Remove markdown headers (##, ###, etc.)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic markdown (**text**, *text*)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      // Remove horizontal rules (---)
      .replace(/^---+$/gm, '')
      // Remove code blocks (```code```)
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code (`code`)
      .replace(/`([^`]+)`/g, '$1')
      // Remove bullet points and list markers
      .replace(/^[\s]*[-*+]\s+/gm, '• ')
      .replace(/^\d+\.\s+/gm, '')
      // Clean up multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim();
  };

  const renderMessage = (message: ChatMessage) => {
    // Ensure content is always a string
    const content = typeof message.content === 'string' ? message.content : String(message.content || '');
    
    return (
      <div key={message.id} className={`chat-message ${message.type}`}>
        <div className="message-content">
          <p>{content}</p>
        </div>
      </div>
    );
  };

  const getSampleQuestions = () => [
    'What are the trends in sales over time?',
    'Create a pie chart of categories',
    'Analyze the correlation between fields',
    'What insights can you find in my data?',
    'Compare this month with last month'
  ];

  return (
    <div className={`ai-chat ${isMinimized ? 'minimized' : 'expanded'} ${className}`}>
      <div className="chat-header" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="chat-title">
          <Zap className="chat-icon" />
          {!isMinimized && <span>AI Assistant</span>}
        </div>
        <div className="chat-toggle">
          <img src="/logo192.png" alt="Toggle" className="toggle-icon" />
        </div>
      </div>
      
      {!isMinimized && (
        <div className="chat-content">
          <div className="chat-main">
            <div className="chat-messages">
              {messages.map(renderMessage)}
              
              {isLoading && (
                <div className="chat-message ai loading">
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            <form className="chat-input-form" onSubmit={handleSubmit}>
              <div className="input-container">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything about your data..."
                  className="chat-input"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="send-button"
                  disabled={!inputValue.trim() || isLoading}
                >
                  {isLoading ? <LucideClockFading className="send-icon" /> : <Send className="send-icon" />}
                </button>
              </div>
            </form>
          </div>
          
          <div className="chat-sidebar">
            <div className="suggestions-header">
              <h4>Try asking:</h4>
            </div>
            <div className="suggestions-list">
              {getSampleQuestions().map((question, index) => (
                <button
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;