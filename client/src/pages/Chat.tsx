import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import '../styles/Chat.css';

type UserType = { _id: string; username: string };
type GroupType = { _id: string; name: string; members?: string[] };
type MessageType={_id:string,content:string,sender:string,recipient?:string,group?:string,createdAt:string}


const Chat = () => {
  const { token, user } = useAuth();
  const socket = useSocket();
  const [users, setUsers] = useState<UserType[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [selectedChat, setSelectedChat] = useState<{ type: 'user' | 'group'; id: string } | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [groupMembers, setGroupMembers] = useState<UserType[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');

  // Fetch users and groups on mount
  useEffect(() => {
    if (!token) return;
    axios.get('http://localhost:5000/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUsers(res.data));
    fetchGroups();
  }, [token]);

  const fetchGroups = useCallback(() => {
    axios.get('http://localhost:5000/api/groups/my', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setGroups(res.data));
  }, [token]);

  // Fetch messages when selectedChat changes
  useEffect(() => {
    if (!selectedChat || !token) return;
    let url = '';
    if (selectedChat.type === 'user') {
      url = `http://localhost:5000/api/messages/user/${selectedChat.id}`;
    } else {
      url = `http://localhost:5000/api/messages/group/${selectedChat.id}`;
      // Also fetch group members
      axios.get(`http://localhost:5000/api/groups/${selectedChat.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setGroupMembers(res.data));
    }
    axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setMessages(res.data));
  }, [selectedChat, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;
    const handleReceive = (msg: MessageType) => {
      if (
        (selectedChat?.type === 'user' && ((msg.recipient === selectedChat.id && msg.sender === user?._id) || (msg.sender === selectedChat.id && msg.recipient === user?._id))) ||
        (selectedChat?.type === 'group' && msg.group === selectedChat.id)
      ) {
        setMessages(prev => [...prev, msg]);
      }
    };
    socket.on('receiveMessage', handleReceive);
    return () => {
      socket.off('receiveMessage', handleReceive);
    };
  }, [socket, selectedChat, user?._id]);

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

    // Optimistically add the message to the UI
    const newMsg = {
      _id: Math.random().toString(36).substr(2, 9),
      ...outgoing,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMsg]);

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
  }, [input, selectedChat, socket, user]);

  
  // Placeholder for group creation
  const handleCreateGroup = async () => {
    if (!newGroupName || newGroupMembers.length === 0) {
      alert('Please enter a group name and select at least one member.');
      return;
    }
    try {
      await axios.post(
        'http://localhost:5000/api/groups/create',
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

  const handleOpenAddMembers = () => {
    setShowAddMembers(true);
  };

  const handleAddMembers = async () => {
    if (!selectedChat || selectedChat.type !== 'group') return;
    try {
      await axios.post(
        `http://localhost:5000/api/groups/${selectedChat.id}/add-members`,
        { members: selectedMembers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowAddMembers(false);
      setSelectedMembers([]);
      // Refresh group members
      axios.get(`http://localhost:5000/api/groups/${selectedChat.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setGroupMembers(res.data));
    } catch (err) {
      alert('Failed to add members.');
    }
  };

  const handleCloseAddMembers = () => {
    setShowAddMembers(false);
  };

  const startEditing = (id: string, content: string) => {
    setEditingMessageId(id);
    setEditContent(content);
  };

  const handleEditMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessageId || !editContent) return;
    try {
      await axios.put(
        `http://localhost:5000/api/messages/${editingMessageId}`,
        { content: editContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMessages();
      setEditingMessageId(null);
      setEditContent('');
    } catch (err) {
      alert('Failed to edit message.');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!id) return;
    try {
      await axios.delete(
        `http://localhost:5000/api/messages/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMessages();
    } catch (err) {
      alert('Failed to delete message.');
    }
  };

  const fetchMessages = useCallback(() => {
    if (!selectedChat || !token) return;
    let url = '';
    if (selectedChat.type === 'user') {
      url = `http://localhost:5000/api/messages/user/${selectedChat.id}`;
    } else {
      url = `http://localhost:5000/api/messages/group/${selectedChat.id}`;
    }
    axios
      .get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setMessages(res.data));
  }, [selectedChat, token]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Remove member from group
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedChat || selectedChat.type !== 'group') return;
    try {
      console.log('Removing member', memberId, 'from group', selectedChat.id);
      await axios.post(
        `http://localhost:5000/api/groups/${selectedChat.id}/remove-member`,
        { memberId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh group members
      axios.get(`http://localhost:5000/api/groups/${selectedChat.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setGroupMembers(res.data));
    } catch (err: any) {
      // Show backend error message if available
      const msg = err?.response?.data?.message || err.message || 'Failed to remove member.';
      alert(msg);
      console.error('Remove member error:', err?.response?.data || err);
    }
  };

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

  return (
    <div className="chat-container">
      <aside className="chat-sidebar">
        <h3>Direct Messages</h3>
        <ul>
          {users.filter(u => u._id !== user?._id).map(userItem => (
            <li
              key={userItem._id}
              className={selectedChat?.type === 'user' && selectedChat.id === userItem._id ? 'active' : ''}
              onClick={() => setSelectedChat({ type: 'user', id: userItem._id })}
            >
              {userItem.username}
            </li>
          ))}
        </ul>
        <h3>Groups</h3>
        <ul>
          {groups
            .filter(group => {
              if (!user) return false;
              // If group.members exists, filter by membership
              if (Array.isArray(group.members)) {
                return group.members.includes(user._id);
              }
              // If no members field, show all (fallback)
              return true;
            })
            .map(group => (
              <li
                key={group._id}
                className={selectedChat?.type === 'group' && selectedChat.id === group._id ? 'active' : ''}
                onClick={() => setSelectedChat({ type: 'group', id: group._id })}
              >
                {group.name}
              </li>
            ))}
        </ul>
        <button onClick={() => setShowCreateGroup(true)}>+ Create Group</button>
      </aside>
      <main className="chat-main">
        <div className="chat-header">
          <h2>{getChatTitle()}</h2>
        </div>
        {selectedChat?.type === 'group' && (
          <div className="group-members">
            <h4>Members</h4>
            <ul style={{ padding: 0, margin: 0 }}>
              {groupMembers.map(member => (
                <li key={member._id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, padding: 4, borderRadius: 6, background: '#f7f7f7' }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#00bcd4',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: 16,
                    marginRight: 12
                  }}>
                    {member.username[0].toUpperCase()}
                  </div>
                  <span style={{ flex: 1 }}>{member.username}</span>
                  {member._id !== user?._id && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove ${member.username} from group?`)) handleRemoveMember(member._id);
                      }}
                      style={{
                        marginLeft: 8,
                        color: '#fff',
                        background: '#e53935',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 12px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'background 0.2s'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <button onClick={() => setShowAddMembers(true)} style={{ marginTop: 8 }}>Add Members</button>
            {showAddMembers && (
              <div className="modal">
                <div className="modal-content" style={{ minWidth: 320, maxWidth: 400, borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', background: '#fff', padding: '2rem 1.5rem' }}>
                  <h5 style={{ marginTop: 0, marginBottom: 16 }}>Add Members</h5>
                  <ul style={{ listStyle: 'none', padding: 0, maxHeight: 180, overflowY: 'auto', marginBottom: 16 }}>
                    {users
                      .filter(u => !groupMembers.some(m => m._id === u._id))
                      .map(user => (
                        <li key={user._id} style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', width: '100%' }}>
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
                              style={{ marginRight: 10, accentColor: '#00bcd4', width: 18, height: 18 }}
                            />
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: '#00bcd4',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: 15,
                              marginRight: 10
                            }}>{user.username[0].toUpperCase()}</div>
                            <span>{user.username}</span>
                          </label>
                        </li>
                      ))}
                  </ul>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={handleAddMembers} style={{ background: '#00bcd4', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', cursor: 'pointer' }}>Add</button>
                    <button onClick={() => setShowAddMembers(false)} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-message ${msg.sender === user?._id ? 'sent' : 'received'}`}
              onDoubleClick={() => {
                if (msg.sender === user?._id) startEditing(msg._id, msg.content);
              }}
            >
              {editingMessageId === msg._id ? (
                <form onSubmit={handleEditMessage} style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setEditingMessageId(null)} style={{ marginLeft: 4 }}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  {msg.content}
                  {msg.sender === user?._id && (
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      style={{ marginLeft: 8, color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form className="chat-input" onSubmit={handleSend}>
          <input
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
        </form>
      </main>
      {showCreateGroup && (
        <div className="modal">
          <div className="modal-content">
            <h5>Create New Group</h5>
            <input
              type="text"
              placeholder="Group name"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
            />
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
            <button onClick={handleCreateGroup}>Create</button>
            <button onClick={() => setShowCreateGroup(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;