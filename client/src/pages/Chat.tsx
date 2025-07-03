import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import '../styles/Chat.css';

type UserType = { _id: string; username: string };
type GroupType = {
  _id: string;
  name: string;
  members?: string[];
  creator?: string | { _id: string; username?: string };
};
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
  const [showMembersMenu, setShowMembersMenu] = useState(false);

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

    if (selectedChat.type === 'group') {
      // Only optimistically add for group chats (optional)
      const newMsg = {
        _id: Math.random().toString(36).substr(2, 9),
        ...outgoing,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMsg]);
    }

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
        <button className='add-group-btn' onClick={() => setShowCreateGroup(true)}>+ Create Group</button>
      </aside>
      <main className="chat-main">
        <div className="chat-header">
          {selectedChat?.type !== 'group' && <h2>{getChatTitle()}</h2>}
        </div>
        {selectedChat?.type === 'group' && (
          <div className="group-members">
            <div className="group-members-header">
              <span className="group-name-header">{getChatTitle()}</span>
              <button
                className="group-members-menu-btn"
                onClick={() => setShowMembersMenu((prev) => !prev)}
                aria-label="Show group members menu"
              >
                ☰
              </button>
            </div>
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
                                await axios.delete(
                                  `http://localhost:5000/api/groups/${selectedChat.id}`,
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
                <div className="modal-content add-members-modal-content">
                  <h5 className="add-members-title">Add Members</h5>
                  <ul className="add-members-list">
                    {users
                      .filter(u => !groupMembers.some(m => m._id === u._id))
                      .map(user => (
                        <li key={user._id} className="add-member-item">
                          <label className="add-member-label">
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
                              className="add-member-checkbox"
                            />
                            <div className="add-member-avatar">{user.username[0].toUpperCase()}</div>
                            <span>{user.username}</span>
                          </label>
                        </li>
                      ))}
                  </ul>
                  <div className="add-members-actions">
                    <button className="add-members-confirm-btn" onClick={handleAddMembers}>Add</button>
                    <button className="add-members-cancel-btn" onClick={() => setShowAddMembers(false)}>Cancel</button>
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