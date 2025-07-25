import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import '../styles/Chat.css';
import React from 'react';
import Navbar from '../components/Navbar';
import EmojiPicker from '../components/EmojiPicker';

type UserType = { _id: string; username: string; isOnline?: boolean; lastSeen?: string };
type GroupType = {
  _id: string;
  name: string;
  members?: string[];
  creator?: string | { _id: string; username?: string };
};
type MessageType = {
  _id: string;
  content: string;
  sender: string | { _id: string; username?: string };
  recipient?: string | { _id: string; username?: string };
  group?: string;
  createdAt: string;
  fileAttachment?: {
    url: string;
    name: string;
    type: string;
    size: number;
  };
  forwarded?: boolean; // <-- Add this line
  deliveredTo?: string[]; // <-- Add this line
  seenBy?: string[]; // <-- Add this line
};

const Chat = () => {
  const { token, user } = useAuth();
  const socket = useSocket();
  const [users, setUsers] = useState<UserType[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [selectedChat, setSelectedChat] = useState<{ type: 'user' | 'group'; id: string } | null>(null);
  // Replace messages state with allMessages
  const [allMessages, setAllMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [groupMembers, setGroupMembers] = useState<UserType[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMembersMenu, setShowMembersMenu] = useState(false);
  
  // File upload states
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add modal state for image preview
  const [modalImage, setModalImage] = useState<string | null>(null);

  // Mobile view state
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  // Detect small screen and reset view on resize
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileView('chat'); // On desktop, always show chat
      } else {
        setMobileView(selectedChat ? 'chat' : 'sidebar');
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedChat]);

  // When a chat is selected on mobile, switch to chat view
  React.useEffect(() => {
    if (window.innerWidth <= 768) {
      setMobileView(selectedChat ? 'chat' : 'sidebar');
    }
  }, [selectedChat]);

  // Fetch users and groups on mount
  useEffect(() => {
    if (!token) return;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    axios.get(`${apiBaseUrl}/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUsers(res.data));
    fetchGroups();
  }, [token]);

  const fetchGroups = useCallback(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    axios.get(`${apiBaseUrl}/groups/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setGroups(res.data));
  }, [token]);

  // Fetch messages when selectedChat changes
  useEffect(() => {
    if (!selectedChat || !token) return;
    let url = '';
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (selectedChat.type === 'user') {
      url = `${apiBaseUrl}/messages/user/${selectedChat.id}`;
    } else {
      url = `${apiBaseUrl}/messages/group/${selectedChat.id}`;
      // Also fetch group members
      axios.get(`${apiBaseUrl}/groups/${selectedChat.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setGroupMembers(res.data));
    }
    axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (selectedChat.type === 'user') {
          console.log('Fetched user-to-user messages:', res.data);
        }
        // Update allMessages with the fetched messages
        setAllMessages(prev => {
          const ids = new Set(prev.map(m => m._id));
          const newMsgs = res.data.filter((m: MessageType) => !ids.has(m._id));
          return [...prev, ...newMsgs];
        });
      });
  }, [selectedChat, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEmojiSelect = (emoji: string) => {
    if (inputRef.current) {
      const input = inputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newValue =
        input.value.substring(0, start) +
        emoji +
        input.value.substring(end);
      setInput(newValue);
      // Move cursor after emoji
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setInput((prev) => prev + emoji);
    }
  };

  // Robust helpers for sender/recipient IDs
  const getSenderId = (sender: string | { _id: string } | undefined) =>
    sender && typeof sender === 'object' && sender !== null ? (sender as any)._id : sender || '';
  const getRecipientId = (recipient: string | { _id: string } | undefined) =>
    recipient && typeof recipient === 'object' && recipient !== null ? (recipient as any)._id : recipient || '';

  // Memoized message item to prevent unnecessary re-renders
  const MessageItem = React.memo((
    {
      msg,
      userId,
      onDelete,
      onEdit,
      selectMode,
      selectedMessageIds,
      setSelectedMessageIds
    }: {
      msg: MessageType;
      userId: string;
      onDelete: (id: string) => void;
      onEdit: (id: string, newContent: string) => Promise<boolean>;
      selectMode: boolean;
      selectedMessageIds: string[];
      setSelectedMessageIds: React.Dispatch<React.SetStateAction<string[]>>;
    }
  ) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editContent, setEditContent] = React.useState(msg.content);
    React.useEffect(() => {
      setEditContent(msg.content);
    }, [msg.content]);

    // Determine if this message is sent by the logged-in user
    const isSentByMe = getSenderId(msg.sender) === userId;

    return (
      <div
        className={`chat-message ${isSentByMe ? 'sent' : 'received'}`}
        style={{ position: 'relative' }}
        onDoubleClick={() => {
          if (!selectMode && isSentByMe && !msg.fileAttachment) setIsEditing(true);
        }}
      >
        {selectMode && (
          <input
            type="checkbox"
            checked={selectedMessageIds.includes(msg._id)}
            onChange={() => {
              if (selectedMessageIds.includes(msg._id)) {
                setSelectedMessageIds(selectedMessageIds.filter(id => id !== msg._id));
              } else {
                setSelectedMessageIds([...selectedMessageIds, msg._id]);
              }
            }}
            style={{ marginRight: 8 }}
          />
        )}
        {(msg as any).forwarded && (
          <div className="forwarded-tag">Forwarded</div>
        )}
        {isEditing ? (
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!editContent.trim()) return;
            const success = await onEdit(msg._id, editContent);
            if (success) setIsEditing(false);
          }} style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              style={{ flex: 1, marginRight: 8 }}
              autoFocus
            />
            <button type="submit">Save</button>
            <button type="button" onClick={() => setIsEditing(false)} style={{ marginLeft: 4 }}>
              Cancel
            </button>
          </form>
        ) : (
          <>
            {msg.fileAttachment?.type?.startsWith('image/') ? (
              <div className="image-attachment">
                <img
                  src={msg.fileAttachment.url}
                  alt={msg.fileAttachment.name}
                  style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', cursor: 'pointer' }}
                  onClick={() => setModalImage(msg.fileAttachment?.url || null)}
                />
              </div>
            ) : msg.fileAttachment ? (
              <div className="file-attachment-info">
                <div className="file-icon">📎</div>
                <div className="file-details">
                  <div className="file-name">{msg.fileAttachment.name}</div>
                  <div className="file-size">{formatFileSize(msg.fileAttachment.size)}</div>
                </div>
                <a
                  href={msg.fileAttachment.url}
                  download={msg.fileAttachment.name}
                  className="download-btn"
                >
                  Download
                </a>
              </div>
            ) : null}

            {/* Only show sender name for group messages from others */}
            {selectedChat?.type === 'group' && !isSentByMe && typeof msg.sender === 'object' && (msg.sender as any).username && (
              <div className="sender-name" style={{ fontWeight: 'bold', fontSize: '0.9em' }}>
                {(msg.sender as any).username}
              </div>
            )}

            {msg.content && <div className="file-message-text">{msg.content}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 4 }}>
  {isSentByMe && !selectMode && (
    <button
      onClick={() => onDelete(msg._id)}
      style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1em' }}
    >
      Delete
    </button>
  )}
  <span className="tick-status" title={
    isSentByMe
      ? msg.seenBy && msg.seenBy.includes(getRecipientId(msg.recipient))
        ? 'Seen'
        : msg.deliveredTo && msg.deliveredTo.includes(getRecipientId(msg.recipient))
          ? 'Delivered'
          : 'Sent'
      : ''
  }>
    {isSentByMe && (
      msg.seenBy && msg.seenBy.includes(getRecipientId(msg.recipient)) ? (
        <span style={{ color: '#2196f3', fontWeight: 'bold', fontSize: '1.1em' }} aria-label="Seen" role="img">✔✔</span>
      ) : msg.deliveredTo && msg.deliveredTo.includes(getRecipientId(msg.recipient)) ? (
        <span style={{ color: '#222', fontWeight: 'bold', fontSize: '1.1em' }} aria-label="Delivered" role="img">✔✔</span>
      ) : (
        <span style={{ color: '#222', fontWeight: 'bold', fontSize: '1.1em' }} aria-label="Sent" role="img">✔</span>
      )
    )}
  </span>
</div>
          </>
        )}
      </div>
    );
  });

  // For displaying messages in the current chat
  const currentMessages = allMessages.filter(msg => {
    if (!selectedChat) return false;
    if (selectedChat.type === 'user') {
      return (
        (getSenderId(msg.sender) === selectedChat.id && getRecipientId(msg.recipient) === user?._id) ||
        (getSenderId(msg.sender) === user?._id && getRecipientId(msg.recipient) === selectedChat.id)
      );
    } else {
      return msg.group === selectedChat.id;
    }
  });

  const fetchMessages = useCallback(() => {
    if (!selectedChat || !token) return;
    let url = '';
    if (selectedChat.type === 'user') {
      url = `${import.meta.env.VITE_API_BASE_URL}/messages/user/${selectedChat.id}`;
    } else {
      url = `${import.meta.env.VITE_API_BASE_URL}/messages/group/${selectedChat.id}`;
    }
    axios
      .get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setAllMessages(prev => {
          const ids = new Set(prev.map(m => m._id));
          const newMsgs = res.data.filter((m: MessageType) => !ids.has(m._id));
          return [...prev, ...newMsgs];
        });
      });
  }, [selectedChat, token]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Listen for incoming messages and user status changes
  useEffect(() => {
    if (!socket) return;
    
    const handleReceive = (msg: MessageType) => {
      setAllMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      console.log('Received message:', msg, 'SelectedChat:', selectedChat, 'User:', user);
      // Always extract IDs as strings
      const myId = user?._id || '';
      const selectedId = selectedChat?.id || '';
      const senderId = getSenderId(msg.sender);
      const recipientId = getRecipientId(msg.recipient);
      if (
        selectedChat?.type === 'user' &&
        (
          (senderId === myId && recipientId === selectedId) ||
          (senderId === selectedId && recipientId === myId)
        )
      ) {
        // setMessages(prev => [...prev, msg]); // This line is no longer needed
        // Fallback: refetch messages to ensure UI is up to date
        fetchMessages();
      }
      if (selectedChat?.type === 'group' && msg.group === selectedChat.id) {
        // setMessages(prev => [...prev, msg]); // This line is no longer needed
      }
    };

    const handleUserStatusChange = (data: { userId: string; isOnline: boolean }) => {
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === data.userId 
            ? { ...user, isOnline: data.isOnline }
            : user
        )
      );
    };

    socket.on('receiveMessage', handleReceive);
    socket.on('userStatusChange', handleUserStatusChange);
    
    return () => {
      socket.off('receiveMessage', handleReceive);
      socket.off('userStatusChange', handleUserStatusChange);
    };
  }, [socket, selectedChat, user?._id, fetchMessages]);

  // Join group room when a group chat is selected
  useEffect(() => {
    if (socket && selectedChat?.type === 'group') {
      socket.emit('joinGroup', selectedChat.id);
    }
  }, [socket, selectedChat]);

  // 1. Emit delivered when a message is received
  useEffect(() => {
    if (!socket || !user || !allMessages.length) return;
    allMessages.forEach((msg) => {
      const isSentByMe = getSenderId(msg.sender) === user._id;
      if (!isSentByMe) {
        socket.emit('messageDelivered', { messageId: msg._id, userId: user._id });
      }
    });
  }, [allMessages, socket, user]);

  // 2. Emit seen when messages are visible (chat is open)
  useEffect(() => {
    if (!socket || !user || !allMessages.length) return;
    // For simplicity, mark all as seen when chat is open
    allMessages.forEach((msg) => {
      const isSentByMe = getSenderId(msg.sender) === user._id;
      if (!isSentByMe) {
        socket.emit('messageSeen', { messageId: msg._id, userId: user._id });
      }
    });
  }, [selectedChat, allMessages, socket, user]);

  // Mark all messages as seen when chat is opened
  useEffect(() => {
    if (!socket || !user || !selectedChat) return;
    // Find all unseen messages in the opened chat
    allMessages.forEach((msg) => {
      const isForThisChat =
        (selectedChat.type === 'user' &&
          ((getSenderId(msg.sender) === selectedChat.id && getRecipientId(msg.recipient) === user._id) ||
           (getSenderId(msg.sender) === user._id && getRecipientId(msg.recipient) === selectedChat.id))) ||
        (selectedChat.type === 'group' && msg.group === selectedChat.id);
      const isSentByMe = getSenderId(msg.sender) === user._id;
      const isSeen = msg.seenBy && msg.seenBy.includes(user._id);
      if (isForThisChat && !isSentByMe && !isSeen) {
        socket.emit('messageSeen', { messageId: msg._id, userId: user._id });
        // Optimistically update seenBy for the current user
        setAllMessages(prev =>
          prev.map(m =>
            m._id === msg._id
              ? { ...m, seenBy: m.seenBy ? [...new Set([...m.seenBy, user._id])] : [user._id] }
              : m
          )
        );
      }
    });
  }, [selectedChat, allMessages, socket, user]);

  useEffect(() => {
    if (!socket) return;

    const handleSeenUpdate = ({ messageId, userId }: { messageId: string, userId: string }) => {
      setAllMessages(prev =>
        prev.map(msg =>
          msg._id === messageId
            ? { ...msg, seenBy: msg.seenBy ? [...new Set([...msg.seenBy, userId])] : [userId] }
            : msg
        )
      );
    };

    socket.on('messageSeen', handleSeenUpdate);

    return () => {
      socket.off('messageSeen', handleSeenUpdate);
    };
  }, [socket]);


  // Send message
  const handleSend = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedChat || !socket || !user || !user._id) {
      console.warn('Send blocked:', {
        input,
        selectedChat,
        socket,
        user,
        userId: user && user._id,
        socketConnected: socket && socket.connected,
      });
      return;
    }

    // Log what will be sent
    const outgoing = {
      content: input,
      sender: user._id,
      recipient: selectedChat.type === 'user' ? selectedChat.id : undefined,
      group: selectedChat.type === 'group' ? selectedChat.id : undefined,
    };
    console.log('Emitting sendMessage:', outgoing);

    // Remove optimistic UI update:
    // setAllMessages(prev => [...prev, newMsg]);
    // Only emit to server, let socket event add the message
    if (selectedChat.type === 'user') {
      socket.emit('sendMessage', {
        content: input,
        sender: user._id,
        recipient: selectedChat.id,
      });
    } else {
      socket.emit('sendMessage', {
        content: input,
        sender: user._id,
        group: selectedChat.id,
      });
    }
    setInput('');
  }, [input, selectedChat, socket, user, users, allMessages]);

  
  // Placeholder for group creation
  const handleCreateGroup = async () => {
    if (!newGroupName || newGroupMembers.length === 0) {
      alert('Please enter a group name and select at least one member.');
      return;
    }
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      await axios.post(
        `${apiBaseUrl}/groups/create`,
        { name: newGroupName, members: newGroupMembers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupMembers([]);
      fetchGroups();
    } catch (err) {
      alert('Failed to create group.');
    }
  };

  const handleAddMembers = async () => {
    if (!selectedChat || selectedChat.type !== 'group') return;
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      await axios.post(
        `${apiBaseUrl}/groups/${selectedChat.id}/add-members`,
        { members: selectedMembers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowAddMembers(false);
      setSelectedMembers([]);
      // Refresh group members
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/groups/${selectedChat.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setGroupMembers(res.data));
    } catch (err) {
      alert('Failed to add members.');
    }
  };

  const handleEditMessage = async (id: string, newContent: string) => {
    if (!id || !newContent) return false;
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      await axios.put(
        `${apiBaseUrl}/messages/${id}`,
        { content: newContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMessages();
      return true;
    } catch (err) {
      alert('Failed to edit message.');
      return false;
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!id) return;
    // Optimistically remove from UI
    setAllMessages(prev => prev.filter(msg => msg._id !== id));
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      await axios.delete(
        `${apiBaseUrl}/messages/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Optionally refetch messages here if you want to be sure
      // fetchMessages();
    } catch (err) {
      alert('Failed to delete message.');
      // Optionally re-add the message if deletion failed
      fetchMessages();
    }
  };

  // File upload functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file, input); // Pass the current input value
    }
  };

  const uploadFile = async (file: File, message: string) => {
    if (!selectedChat || !token) {
      alert('Please select a chat first.');
      return;
    }

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const uploadResponse = await axios.post(
        `${apiBaseUrl}/upload/file`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const fileInfo = uploadResponse.data.file;

      const outgoing = {
        content: message || `Sent: ${file.name}`,
        sender: user!._id,
        recipient: selectedChat.type === 'user' ? selectedChat.id : undefined,
        group: selectedChat.type === 'group' ? selectedChat.id : undefined,
        fileAttachment: fileInfo
      };

      // Remove optimistic UI update:
      // setAllMessages(prev => [...prev, newMsg]);
      // Only emit to server, let socket event add the message
      socket?.emit('sendMessage', outgoing);

      setInput('');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file.');
    } finally {
      setUploadingFile(false);
    }
  };

  const openFileUpload = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Add getChatTitle helper
  const getChatTitle = () => {
    if (!selectedChat) return '';
    if (selectedChat.type === 'user') {
      const u = users.find(u => u._id === selectedChat.id);
      return u ? u.username : '';
    } else {
      const g = groups.find(g => g._id === selectedChat.id);
      return g ? g.name : '';
    }
  };

  // Add handleRemoveMember helper
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedChat || selectedChat.type !== 'group') return;
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      await axios.post(
        `${apiBaseUrl}/groups/${selectedChat.id}/remove-member`,
        { memberId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh group members
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/groups/${selectedChat.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setGroupMembers(res.data));
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to remove member.';
      alert(msg);
    }
  };

  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);

  const handleForward = async (type: 'user' | 'group', id: string) => {
    // Find the selected messages
    const messagesToForward = allMessages.filter(msg => selectedMessageIds.includes(msg._id));
    for (const msg of messagesToForward) {
      // Prepare the outgoing message
      const outgoing: any = {
        content: msg.content,
        sender: user!._id,
        recipient: type === 'user' ? id : undefined,
        group: type === 'group' ? id : undefined,
        forwarded: true, // <--- This marks the message as forwarded
      };
      if (msg.fileAttachment) {
        outgoing.fileAttachment = msg.fileAttachment;
      }
      // Send via socket
      socket?.emit('sendMessage', outgoing);
    }
    setShowForwardModal(false);
    setSelectMode(false);
    setSelectedMessageIds([]);

    // Redirect to the destination chat after forwarding
    setSelectedChat({ type, id });
    if (window.innerWidth <= 768) setMobileView('chat');
  };

  // Helper: Get unread count for a chat
  const getUnreadCount = (chat: { type: 'user' | 'group', id: string }) => {
    // Only count messages not seen by the current user
    return allMessages.filter(msg => {
      const isForThisChat =
        (chat.type === 'user' &&
          ((getSenderId(msg.sender) === chat.id && getRecipientId(msg.recipient) === user?._id) ||
           (getSenderId(msg.sender) === user?._id && getRecipientId(msg.recipient) === chat.id))) ||
        (chat.type === 'group' && msg.group === chat.id);
      const isSentByMe = getSenderId(msg.sender) === user?._id;
      const isSeen = msg.seenBy && msg.seenBy.includes(user?._id || '');
      return isForThisChat && !isSentByMe && !isSeen;
    }).length;
  };
  // Helper: Get latest message time for a chat
  const getLatestMessageTime = (chat: { type: 'user' | 'group', id: string }) => {
    const chatMessages = allMessages.filter(msg =>
      (chat.type === 'user' &&
        ((getSenderId(msg.sender) === chat.id && getRecipientId(msg.recipient) === user?._id) ||
         (getSenderId(msg.sender) === user?._id && getRecipientId(msg.recipient) === chat.id))) ||
      (chat.type === 'group' && msg.group === chat.id)
    );
    if (chatMessages.length === 0) return 0;
    return Math.max(...chatMessages.map(msg => new Date(msg.createdAt).getTime()));
  };

  // Sidebar sorted users and groups
  const sortedUsers = users
    .filter(u => u._id !== user?._id)
    .map(u => ({ ...u, chat: { type: 'user', id: u._id } }))
    .sort((a, b) => {
      const unreadA = getUnreadCount({ type: 'user', id: a._id });
      const unreadB = getUnreadCount({ type: 'user', id: b._id });
      if (unreadA !== unreadB) return unreadB - unreadA;
      // Sort by latest message time DESCENDING (most recent first)
      return getLatestMessageTime({ type: 'user', id: b._id }) - getLatestMessageTime({ type: 'user', id: a._id });
    });
  const sortedGroups = groups
    .filter(group => {
      if (!user) return false;
      if (Array.isArray(group.members)) {
        return group.members.includes(user._id);
      }
      return true;
    })
    .map(g => ({ ...g, chat: { type: 'group', id: g._id } }))
    .sort((a, b) => {
      const unreadA = getUnreadCount({ type: 'group', id: a._id });
      const unreadB = getUnreadCount({ type: 'group', id: b._id });
      if (unreadA !== unreadB) return unreadB - unreadA;
      // Sort by latest message time DESCENDING (most recent first)
      return getLatestMessageTime({ type: 'group', id: b._id }) - getLatestMessageTime({ type: 'group', id: a._id });
    });

  // Force re-render of sidebar when selectedChat or allMessages changes
  useEffect(() => {}, [selectedChat, allMessages]);

  return (
    <>
      {/* Show Navbar only on desktop, or on mobile when sidebar is visible */}
      {window.innerWidth > 768 || mobileView === 'sidebar' ? <Navbar /> : null}
      <div className={`chat-container${window.innerWidth <= 768 ? ` mobile-${mobileView}` : ''}`}>
        {/* Sidebar */}
        <aside className="chat-sidebar" style={window.innerWidth <= 768 && mobileView !== 'sidebar' ? { display: 'none' } : {}}>
          <div className="sidebar-section">
            <h3>Direct Messages</h3>
            <ul>
              {sortedUsers.map(userItem => (
                <li
                  key={userItem._id}
                  className={selectedChat?.type === 'user' && selectedChat.id === userItem._id ? 'active' : ''}
                  onClick={() => {
                    setSelectedChat({ type: 'user', id: userItem._id });
                    if (window.innerWidth <= 768) setMobileView('chat');
                  }}
                >
                  <div className="user-item">
                    <span className="username">{userItem.username}</span>
                    <span className={`online-status ${userItem.isOnline ? 'online' : 'offline'}`}>
                      {userItem.isOnline ? '●' : '○'}
                    </span>
                    {getUnreadCount({ type: 'user', id: userItem._id }) > 0 && (
                      <span className="badge">
                        {getUnreadCount({ type: 'user', id: userItem._id })}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="sidebar-section">
            <h3>Groups</h3>
            <ul>
              {sortedGroups.map(group => {
                const count = getUnreadCount({ type: 'group', id: group._id });
                console.log('Group:', group.name, 'Unread:', count);
                return (
                  <li
                    key={group._id}
                    className={selectedChat?.type === 'group' && selectedChat.id === group._id ? 'active' : ''}
                    onClick={() => {
                      setSelectedChat({ type: 'group', id: group._id });
                      if (window.innerWidth <= 768) setMobileView('chat');
                    }}
                  >
                    {group.name}
                    {count > 0 && (
                      <span className="badge">
                        {count}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <button className='add-group-btn' onClick={() => setShowCreateGroup(true)}>+ Create Group</button>
        </aside>






        {/* Chat Main */}
        <main className="chat-main" style={window.innerWidth <= 768 && mobileView !== 'chat' ? { display: 'none' } : {}}>
          <div className="chat-header">
            {/* Back button for mobile, inside header, left-aligned */}
            {window.innerWidth <= 768 && mobileView === 'chat' && (
              <button
                className="mobile-back-btn"
                onClick={() => setMobileView('sidebar')}
              >
                ← Back
              </button>
            )}
            {selectedChat?.type !== 'group' && (
              <div className="chat-title-row">
                <div className="chat-title-with-status">
                  <h2>{getChatTitle()}</h2>
                  {selectedChat?.type === 'user' && (
                    <span className={`header-online-status ${users.find(u => u._id === selectedChat.id)?.isOnline ? 'online' : 'offline'}`}>
                      {(() => {
                        const selectedUser = users.find(u => u._id === selectedChat.id);
                        if (selectedUser?.isOnline) {
                          return '● Online';
                        } else if (selectedUser?.lastSeen) {
                          return `○ Last seen ${formatLastSeen(selectedUser.lastSeen)}`;
                        } else {
                          return '○ Offline';
                        }
                      })()}
                    </span>
                  )}
                </div>
                <button
                  className="select-messages-btn"
                  onClick={() => {
                    setSelectMode((prev) => !prev);
                    setSelectedMessageIds([]); // Clear selection when toggling
                  }}
                >
                  {selectMode ? 'Cancel Selection' : 'Select Messages'}
                </button>
              </div>
            )}
          </div>
          {/* Forward bar for user-to-user chat */}
          {selectedChat && selectedChat.type === 'user' && selectMode && selectedMessageIds.length > 0 && (
            <button
              className="forward-btn"
              onClick={() => setShowForwardModal(true)}
              style={{ marginLeft: 0, marginTop: '10px', marginBottom: '10px' }}
            >
              Forward ({selectedMessageIds.length})
            </button>
          )}
          {selectedChat?.type === 'group' && (
            <div className="group-members">
              <div className="group-members-header">
                <div className="chat-title-row">
                  <span className="group-name-header">{getChatTitle()}</span>
                  <button
                    className="select-messages-btn"
                    onClick={() => {
                      setSelectMode((prev) => !prev);
                      setSelectedMessageIds([]); // Clear selection when toggling
                    }}
                  >
                    {selectMode ? 'Cancel Selection' : 'Select Messages'}
                  </button>
                </div>
                <button
                  className="group-members-menu-btn"
                  onClick={() => setShowMembersMenu((prev) => !prev)}
                  aria-label="Show group members menu"
                >
                  ☰
                </button>
              </div>
              {selectMode && selectedMessageIds.length > 0 && (
                <button
                  className="forward-btn"
                  onClick={() => setShowForwardModal(true)}
                  style={{ marginLeft: 0, marginTop: '10px', marginBottom: '10px' }}
                >
                  Forward ({selectedMessageIds.length})
                </button>
              )}










              {showMembersMenu && !showAddMembers && (
                <div className="group-members-modal-overlay" onClick={() => setShowMembersMenu(false)}>
                  <div className="group-members-modal" onClick={e => e.stopPropagation()}>
                    <button
                      className="group-members-modal-close"
                      onClick={() => setShowMembersMenu(false)}
                      aria-label="Close members menu"
                    >
                      ×
                    </button>
                    <ul className="group-members-list">
                      {groupMembers.map(member => (
                        <li key={member._id} className="group-member-item">
                          <div className="member-avatar">
                            {member.username[0].toUpperCase()}
                          </div>
                          <span className="group-member-info">
                            <span>
                              {member.username}
                              {(() => {
                                const group = groups.find(g => g._id === selectedChat.id);
                                const isMemberAdmin =
                                  group &&
                                  group.creator &&
                                  (
                                    (typeof group.creator === 'string' && group.creator === member._id) ||
                                    (typeof group.creator === 'object' && group.creator._id === member._id)
                                  );
                                return isMemberAdmin ? (
                                  <span className="admin-badge">
                                    (admin)
                                  </span>
                                ) : null;
                              })()}
                            </span>
                            {(() => {
                              const group = groups.find(g => g._id === selectedChat.id);
                              const isAdmin =
                                group &&
                                group.creator &&
                                (
                                  (typeof group.creator === 'string' && group.creator === user?._id) ||
                                  (typeof group.creator === 'object' && group.creator._id === user?._id)
                                );
                              const isMemberAdmin =
                                group &&
                                group.creator &&
                                (
                                  (typeof group.creator === 'string' && group.creator === member._id) ||
                                  (typeof group.creator === 'object' && group.creator._id === member._id)
                                );
                              if ((isAdmin && !isMemberAdmin) || (member._id === user?._id)) {
                                return (
                                  <button
                                    className={`member-action-btn${member._id === user?._id ? ' leave' : ''}`}
                                    onClick={() => {
                                      if (member._id === user?._id) {
                                        if (window.confirm('Are you sure you want to leave this group?')) handleRemoveMember(member._id);
                                      } else {
                                        if (window.confirm(`Remove ${member.username} from group?`)) handleRemoveMember(member._id);
                                      }
                                    }}
                                  >
                                    {member._id === user?._id ? 'Leave' : 'Remove'}
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <button className="add-members-btn" onClick={e => { e.stopPropagation(); setShowAddMembers(true); }}>Add Members</button>
                    {(() => {
                      const group = groups.find(g => g._id === selectedChat.id);
                      const isCreator =
                        group &&
                        group.creator &&
                        (
                          (typeof group.creator === 'string' && group.creator === user?._id) ||
                          (typeof group.creator === 'object' && group.creator._id === user?._id)
                        );
                      if (isCreator) {
                        return (
                          <button
                            className="delete-group-btn"
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this group? This cannot be undone.')) {
                                try {
                                  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
                                  await axios.delete(
                                    `${apiBaseUrl}/groups/${selectedChat.id}`,
                                    { headers: { Authorization: `Bearer ${token}` } }
                                  );
                                  setGroups(prev => prev.filter(g => g._id !== selectedChat.id));
                                  setSelectedChat(null);
                                  alert('Group deleted!');
                                } catch (err) {
                                  alert('Failed to delete group.');
                                }
                              }
                            }}
                          >
                            Delete Group
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}






              {showAddMembers && (
                <div className="modal">
                  <div className="modal-content add-members-modal">
                    <h5>Add Members</h5>
                    <div className="add-members-form">
                      <div className="members-section">
                        <h6>Select Members to Add</h6>
                        <ul>
                          {users
                            .filter(u => !groupMembers.some(m => m._id === u._id))
                            .map(user => (
                              <li key={user._id}>
                                <label>
                                  <input
                                    type="checkbox"
                                    value={user._id}
                                    checked={selectedMembers.includes(user._id)}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setSelectedMembers(prev => [...prev, user._id]);
                                      } else {
                                        setSelectedMembers(prev => prev.filter(id => id !== user._id));
                                      }
                                    }}
                                  />
                                  <div className="member-avatar">{user.username[0].toUpperCase()}</div>
                                  <span>{user.username}</span>
                                </label>
                              </li>
                            ))}
                        </ul>
                      </div>
                      <div className="button-group">
                        <button onClick={handleAddMembers}>Add Members</button>
                        <button onClick={() => setShowAddMembers(false)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="chat-messages">
            {currentMessages.map((msg) => (
              <MessageItem
                key={msg._id}
                msg={msg}
                userId={user?._id || ''}
                onDelete={handleDeleteMessage}
                onEdit={handleEditMessage}
                selectMode={selectMode}
                selectedMessageIds={selectedMessageIds}
                setSelectedMessageIds={setSelectedMessageIds}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
          {showForwardModal && (
            <div className="modal">
              <div className="modal-content forward-modal">
                <h5>Forward to...</h5>
                <ul>
                  {/* List users */}
                  {users.filter(u => u._id !== user?._id).map(u => (
                    <li key={u._id}>
                      <button
                        onClick={() => handleForward('user', u._id)}
                        style={{ width: '100%' }}
                      >
                        {u.username}
                      </button>
                    </li>
                  ))}
                  {/* List groups */}
                  {user?._id && groups
                    .filter(g => Array.isArray(g.members) && g.members.includes(user._id))
                    .map(g => (
                      <li key={g._id}>
                        <button
                          onClick={() => handleForward('group', g._id)}
                          style={{ width: '100%' }}
                        >
                          {g.name}
                        </button>
                      </li>
                    ))}
                </ul>
                <button onClick={() => setShowForwardModal(false)}>Cancel</button>
              </div>
            </div>
          )}
          {/* Image Modal */}
          {modalImage && (
            <div className="image-modal-overlay" onClick={() => setModalImage(null)}>
              <div className="image-modal-content" onClick={e => e.stopPropagation()}>
                <img src={modalImage} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px' }} />
                <button className="image-modal-close" onClick={() => setModalImage(null)} style={{ marginTop: 8 }}>Close</button>
              </div>
            </div>
          )}
          <form className="chat-input" onSubmit={handleSend}>
            <div className="input-container">
              <button
                type="button"
                className="emoji-btn"
                onClick={() => setShowEmojiPicker((v) => !v)}
                style={{ fontSize: 22, marginRight: 8 }}
                tabIndex={-1}
              >
                😀
              </button>
              <EmojiPicker
                visible={showEmojiPicker}
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
              <button
                type="button"
                className="upload-btn"
                onClick={openFileUpload}
                disabled={!selectedChat || uploadingFile}
                title="Upload file"
              >
                {uploadingFile ? '⏳' : '+'}
              </button>
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a message..."
                value={input}
                onChange={e => setInput(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                disabled={
                  !input.trim() ||
                  !selectedChat ||
                  !socket ||
                  !user ||
                  !user._id
                }
              >
                Send
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx"
            />
          </form>
        </main>





        {showCreateGroup && (
          <div className="modal">
            <div className="modal-content create-group-modal">
              <h5>Create New Group</h5>
              <div className="create-group-form">
                <input
                  type="text"
                  placeholder="Enter group name..."
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                />
                <div className="members-section">
                  <h6>Select Members</h6>
                  <ul>
                    {users.map(user => (
                      <li key={user._id}>
                        <label>
                          <input
                            type="checkbox"
                            value={user._id}
                            checked={newGroupMembers.includes(user._id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setNewGroupMembers(prev => [...prev, user._id]);
                              } else {
                                setNewGroupMembers(prev => prev.filter(id => id !== user._id));
                              }
                            }}
                          />
                          {user.username}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="button-group">
                  <button onClick={handleCreateGroup}>Create Group</button>
                  <button onClick={() => setShowCreateGroup(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Chat;