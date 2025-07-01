import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import '../styles/Chat.css';

type UserType = { _id: string; username: string };
type GroupType = { _id: string; name: string };

const Chat = () => {
  const socket = useSocket();
  const { token } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [selectedChat, setSelectedChat] = useState<{ type: 'user' | 'group'; id: string } | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [groupMembers, setGroupMembers] = useState<UserType[]>([]);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);

  // Fetch users and groups on mount
  useEffect(() => {
    if (!token) return;
    axios
      .get('http://localhost:5000/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUsers(res.data));
    axios
      .get('http://localhost:5000/api/groups/my', { headers: { Authorization: `Bearer ${token}` } })
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
    }
    axios
      .get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setMessages(res.data));
  }, [selectedChat, token]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;
    const handleReceive = (msg: any) => {
      // Only add message if it belongs to the current chat
      if (
        (selectedChat?.type === 'user' && msg.recipient === selectedChat.id) ||
        (selectedChat?.type === 'group' && msg.group === selectedChat.id)
      ) {
        setMessages(prev => [...prev, msg]);
      }
    };
    socket.on('receiveMessage', handleReceive);
    return () => {
      socket.off('receiveMessage', handleReceive);
    };
  }, [socket, selectedChat]);

  // Send message
  const handleSend = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || !selectedChat || !socket) return;

      if (selectedChat.type === 'user') {
        socket.emit('sendMessage', {
          content: input,
          recipient: selectedChat.id,
        });
      } else {
        socket.emit('sendMessage', {
          content: input,
          group: selectedChat.id,
        });
      }
      setInput('');
    },
    [input, selectedChat, socket]
  );

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

  const handleAddMembers = () => {
    // Implementation of adding members
    alert('Members added');
    setShowAddMembers(false);
  };

  const handleCloseAddMembers = () => {
    setShowAddMembers(false);
  };

  // Fetch groups
  const fetchGroups = useCallback(() => {
    axios
      .get('http://localhost:5000/api/groups/my', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setGroups(res.data));
  }, [token]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return (
    <div className="chat-container">
      <aside className="chat-sidebar">
        <h3>Direct Messages</h3>
        <ul>
          {users.map(user => (
            <li
              key={user._id}
              className={selectedChat?.type === 'user' && selectedChat.id === user._id ? 'active' : ''}
              onClick={() => setSelectedChat({ type: 'user', id: user._id })}
            >
              {user.username}
            </li>
          ))}
        </ul>
        <h3>Groups</h3>
        <ul>
          {groups.map(group => (
            <li
              key={group._id}
              className={selectedChat?.type === 'group' && selectedChat.id === group._id ? 'active' : ''}
              onClick={() => setSelectedChat({ type: 'group', id: group._id })}
            >
              {group.name}
            </li>
          ))}
        </ul>
        {selectedChat?.type === 'group' && (
          <div className="group-members">
            <h4>Members</h4>
            <ul>
              {groupMembers.map(member => (
                <li key={member._id}>{member.username}</li>
              ))}
            </ul>
            <button onClick={handleOpenAddMembers}>Add Members</button>
            {showAddMembers && (
              <div className="modal">
                <h5>Select users to add:</h5>
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
                          {user.username}
                        </label>
                      </li>
                    ))}
                </ul>
                <button onClick={handleAddMembers}>Add</button>
                <button onClick={handleCloseAddMembers}>Cancel</button>
              </div>
            )}
          </div>
        )}
        <button onClick={() => setShowCreateGroup(true)}>+ Create Group</button>
      </aside>
      <main className="chat-main">
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-message ${msg.sender === 'me' ? 'sent' : 'received'}`}
            >
              {msg.content}
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
          <button type="submit">Send</button>
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