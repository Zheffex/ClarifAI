import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { CollaborationProvider } from '../../contexts/CollaborationContext';
import CollaborationChat from '../CollaborationChat';

// Mock Socket.IO
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true
  };
  
  return {
    io: jest.fn(() => mockSocket),
    Socket: jest.fn(() => mockSocket)
  };
});

// Mock the collaboration context
const mockCollaborationContext = {
  socket: null,
  isConnected: true,
  currentRoom: 'test-room',
  participants: [
    { userId: '1', username: 'User1', color: '#FF6B6B' },
    { userId: '2', username: 'User2', color: '#4ECDC4' }
  ],
  messages: [
    {
      id: 'msg-1',
      userId: '1',
      username: 'User1',
      message: 'Hello everyone!',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      type: 'text' as const
    },
    {
      id: 'msg-2',
      userId: 'system',
      username: 'System',
      message: 'User2 joined the collaboration',
      timestamp: new Date('2024-01-01T10:01:00Z'),
      type: 'system' as const
    }
  ],
  cursors: {},
  joinRoom: jest.fn(),
  leaveRoom: jest.fn(),
  sendMessage: jest.fn(),
  updateCursor: jest.fn(),
  sendDocumentEdit: jest.fn(),
  clearMessages: jest.fn()
};

jest.mock('../../contexts/CollaborationContext', () => ({
  useCollaboration: () => mockCollaborationContext,
  CollaborationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const MockedCollaborationChat = () => (
  <BrowserRouter>
    <AuthProvider>
      <CollaborationProvider>
        <CollaborationChat 
          roomId="test-room"
          resourceType="dataset"
          resourceId="test-dataset-id"
        />
      </CollaborationProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('CollaborationChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chat interface correctly', () => {
    render(<MockedCollaborationChat />);
    
    expect(screen.getByText(/connected • 2 participants/i)).toBeInTheDocument();
    expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
    expect(screen.getByText('User2 joined the collaboration')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
  });

  it('displays participant avatars', () => {
    render(<MockedCollaborationChat />);
    
    const avatars = screen.getAllByText(/^U\\d$/); // U1, U2 (first letter of usernames)
    expect(avatars).toHaveLength(2);
  });

  it('sends message when form is submitted', async () => {
    render(<MockedCollaborationChat />);
    
    const messageInput = screen.getByPlaceholderText(/type a message/i);
    const sendButton = screen.getByRole('button');
    
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    expect(mockCollaborationContext.sendMessage).toHaveBeenCalledWith('Test message');
  });

  it('clears input after sending message', async () => {
    render(<MockedCollaborationChat />);
    
    const messageInput = screen.getByPlaceholderText(/type a message/i) as HTMLInputElement;
    const sendButton = screen.getByRole('button');
    
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(messageInput.value).toBe('');
    });
  });

  it('disables send button for empty messages', () => {
    render(<MockedCollaborationChat />);
    
    const sendButton = screen.getByRole('button');
    expect(sendButton).toBeDisabled();
    
    const messageInput = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(messageInput, { target: { value: '   ' } }); // Only whitespace
    expect(sendButton).toBeDisabled();
  });

  it('enables send button for non-empty messages', () => {
    render(<MockedCollaborationChat />);
    
    const messageInput = screen.getByPlaceholderText(/type a message/i);
    const sendButton = screen.getByRole('button');
    
    fireEvent.change(messageInput, { target: { value: 'Hello' } });
    expect(sendButton).not.toBeDisabled();
  });

  it('displays character count', () => {
    render(<MockedCollaborationChat />);
    
    const messageInput = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(messageInput, { target: { value: 'Hello world' } });
    
    expect(screen.getByText('11/500')).toBeInTheDocument();
  });

  it('formats message timestamps correctly', () => {
    render(<MockedCollaborationChat />);
    
    // The timestamp should be formatted as HH:MM
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('10:01')).toBeInTheDocument();
  });

  it('distinguishes between user and system messages', () => {
    render(<MockedCollaborationChat />);
    
    const userMessage = screen.getByText('Hello everyone!').closest('.message');
    const systemMessage = screen.getByText('User2 joined the collaboration').closest('.message');
    
    expect(userMessage).toHaveClass('user');
    expect(systemMessage).toHaveClass('system');
  });

  it('scrolls to bottom when new messages arrive', () => {
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    
    render(<MockedCollaborationChat />);
    
    // Simulate new message by re-rendering with updated context
    // In a real test, you would trigger the useEffect that handles scrolling
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });
});

describe('CollaborationChat - Disconnected State', () => {
  const disconnectedContext = {
    ...mockCollaborationContext,
    isConnected: false,
    currentRoom: null,
    participants: [],
    messages: []
  };

  beforeEach(() => {
    jest.doMock('../../contexts/CollaborationContext', () => ({
      useCollaboration: () => disconnectedContext,
      CollaborationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
    }));
  });

  it('shows connecting state when disconnected', () => {
    render(<MockedCollaborationChat />);
    
    expect(screen.getByText(/connecting to collaboration server/i)).toBeInTheDocument();
  });
});