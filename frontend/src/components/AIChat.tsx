import React, { useState, useEffect, useRef } from 'react';
import { NLPService, NLPResponse } from '../services/nlpService';
import { Dataset } from '../types/api';
import './AIChat.css';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  response?: NLPResponse;
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
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'ai',
        content: 'Hi! I\\'m your AI assistant. I can help you analyze data, create visualizations, and answer questions about your datasets. Try asking me something like \"Show me a bar chart of sales by region\" or \"What are the trends in my data?\"',
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
      const nlpResponse = await NLPService.processQuery(userMessage.content, datasets);
      
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: generateAIResponse(nlpResponse),
        timestamp: new Date(),
        response: nlpResponse
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        content: 'I\\'m sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = (nlpResponse: NLPResponse): string => {
    let response = nlpResponse.interpretation;
    
    if (nlpResponse.confidence < 0.6) {
      response += ' However, I\\'m not entirely sure I understood correctly.';
    }
    
    if (nlpResponse.suggestedActions.length > 0) {
      response += ' Here are some actions I can help you with:';
    }
    
    return response;
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

  const renderMessage = (message: ChatMessage) => {
    return (
      <div key={message.id} className={`chat-message ${message.type}`}>
        <div className=\"message-header\">
          <div className=\"message-avatar\">
            {message.type === 'user' ? '👤' : '🤖'}
          </div>
          <div className=\"message-info\">
            <span className=\"message-sender\">
              {message.type === 'user' ? 'You' : 'AI Assistant'}
            </span>
            <span className=\"message-time\">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
        </div>
        
        <div className=\"message-content\">
          <p>{message.content}</p>
          
          {message.response && (
            <div className=\"message-actions\">
              {message.response.confidence < 0.6 && (
                <div className=\"confidence-warning\">
                  ⚠️ I\\'m not very confident about this interpretation (confidence: {Math.round(message.response.confidence * 100)}%)
                </div>
              )}
              
              {message.response.suggestedActions.length > 0 && (
                <div className=\"suggested-actions\">
                  <h4>Suggested Actions:</h4>
                  <div className=\"actions-list\">
                    {message.response.suggestedActions.map((action, index) => (
                      <button
                        key={index}
                        className=\"action-button\"
                        onClick={() => handleActionClick(action)}
                      >
                        {getActionIcon(action.type)} {action.description}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {message.response.followUpQuestions && message.response.followUpQuestions.length > 0 && (
                <div className=\"follow-up-questions\">
                  <h4>Follow-up questions:</h4>
                  <div className=\"questions-list\">
                    {message.response.followUpQuestions.map((question, index) => (
                      <button
                        key={index}
                        className=\"question-button\"
                        onClick={() => handleSuggestionClick(question)}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'chart': return '📊';
      case 'filter': return '🔍';
      case 'aggregation': return '📈';
      case 'export': return '💾';
      default: return '⚡';
    }
  };

  const getSampleQuestions = () => [
    'Show me a bar chart of my data',
    'What are the trends in sales over time?',
    'Create a pie chart of categories',
    'Analyze the correlation between fields',
    'What insights can you find in my data?',
    'Compare this month with last month'
  ];

  return (
    <div className={`ai-chat ${isExpanded ? 'expanded' : 'collapsed'} ${className}`}>
      <div className=\"chat-header\" onClick={() => setIsExpanded(!isExpanded)}>
        <div className=\"chat-title\">
          <span className=\"chat-icon\">🤖</span>
          <span>AI Assistant</span>
          {!isExpanded && messages.length > 1 && (
            <span className=\"message-count\">{messages.length - 1}</span>
          )}
        </div>
        <div className=\"chat-toggle\">
          {isExpanded ? '▼' : '▲'}
        </div>
      </div>
      
      {isExpanded && (
        <div className=\"chat-content\">
          <div className=\"chat-messages\">
            {messages.map(renderMessage)}
            
            {isLoading && (
              <div className=\"chat-message ai loading\">
                <div className=\"message-header\">
                  <div className=\"message-avatar\">🤖</div>
                  <div className=\"message-info\">
                    <span className=\"message-sender\">AI Assistant</span>
                  </div>
                </div>
                <div className=\"message-content\">
                  <div className=\"typing-indicator\">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {messages.length === 1 && (
            <div className=\"sample-questions\">
              <h4>Try asking:</h4>
              <div className=\"questions-grid\">
                {getSampleQuestions().map((question, index) => (
                  <button
                    key={index}
                    className=\"sample-question\"
                    onClick={() => handleSuggestionClick(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <form className=\"chat-input-form\" onSubmit={handleSubmit}>
            <div className=\"input-container\">
              <input
                ref={inputRef}
                type=\"text\"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder=\"Ask me anything about your data...\"
                className=\"chat-input\"
                disabled={isLoading}
              />
              <button
                type=\"submit\"
                className=\"send-button\"
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIChat;", "original_text": "", "replace_all": false}]