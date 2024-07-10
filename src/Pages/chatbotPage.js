import React, { useState, useEffect, useRef } from 'react';
import FileUploadWidget from '../Components/fileUploadWidget';
import { handleFileUpload, handleUserMessageSubmit, generateDocument } from '../Chatbot/chatbotLogic';
import './chatbotPage.css';

const ChatbotPage = () => {
  const [messages, setMessages] = useState([
    { text: 'Hello! How can I help you today?', fromBot: true },
    { text: 'Please upload a file to get started.', fromBot: true }
  ]);
  const [userMessage, setUserMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [documentStructure, setDocumentStructure] = useState(null);
  const [userInputs, setUserInputs] = useState({});

  const originalStructureRef = useRef(null);

  useEffect(() => {
    if (documentStructure && !originalStructureRef.current) {
      originalStructureRef.current = JSON.parse(JSON.stringify(documentStructure));
    }
  }, [documentStructure]);

  useEffect(() => {
    if (documentStructure) {
      const initializeInputs = (obj, path = '') => {
        return Object.entries(obj).reduce((acc, [key, value]) => {
          const fullPath = path ? `${path}.${key}` : key;
          if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
              acc[fullPath] = value.map((item, index) => initializeInputs(item, `${fullPath}.${index}`));
            } else {
              acc[fullPath] = initializeInputs(value, fullPath);
            }
          } else {
            acc[fullPath] = '';
          }
          return acc;
        }, {});
      };

      setUserInputs(initializeInputs(documentStructure));
    }
  }, [documentStructure]);

  const handleFileChange = (files) => handleFileUpload(files, setMessages, setFiles);

  const handleUserMessageChange = (e) => setUserMessage(e.target.value);

  const handleUserMessageSubmitWrapper = (e) => {
    e.preventDefault();
    handleUserMessageSubmit(userMessage, setMessages, setUserMessage, files, setDocumentStructure);
  };

  const handleInputChange = (path, value) => {
    setUserInputs(prevInputs => {
      const newInputs = { ...prevInputs };
      const keys = path.split('.');
      let current = newInputs;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newInputs;
    });
  };

  const handleGenerateDocument = () => generateDocument(documentStructure, userInputs, setMessages);

  const camelToTitleCase = (str) => str.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();

  const addItem = (path) => {
    setDocumentStructure((prevStructure) => {
      const newStructure = JSON.parse(JSON.stringify(prevStructure)); 
      const keys = path.split('.');
      let current = newStructure;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }

      const lastKey = keys[keys.length - 1];
      const firstItem = current[lastKey][0];

      if (firstItem) {
        const newItem = Object.keys(firstItem).reduce((acc, key) => {
          acc[key] = Array.isArray(firstItem[key]) ? [] : '';
          return acc;
        }, {});
        current[lastKey].push(newItem);
      } else if (originalStructureRef.current) {
        let originalItem = originalStructureRef.current;
        keys.forEach((key) => {
          originalItem = originalItem[key];
        });
        const newItem = Object.keys(originalItem[0]).reduce((acc, key) => {
          acc[key] = Array.isArray(originalItem[0][key]) ? [] : '';
          return acc;
        }, {});
        current[lastKey].push(newItem);
      }

      return newStructure;
    });
  };

  const deleteItem = (path, index) => {
    setDocumentStructure(prevStructure => {
      const newStructure = { ...prevStructure };
      const keys = path.split('.');
      let current = newStructure;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]].splice(index, 1);
      return newStructure;
    });
  };

  const getUserInputValue = (path) => {
    return path.split('.').reduce((obj, key) => (obj && obj[key] !== 'undefined') ? obj[key] : '', userInputs);
  };

  const renderDocumentStructure = (structure, path = '') => {
    return Object.entries(structure).map(([key, value]) => {
      const fullPath = path ? `${path}.${key}` : key;
      const titleCaseKey = camelToTitleCase(key);

      if (Array.isArray(value)) {
        return (
          <div key={fullPath} className="nested-section">
            <h3>{titleCaseKey}</h3>
            {value.map((item, index) => (
              <div key={`${fullPath}.${index}`} className="array-item">
                <div className="array-item-header">
                  <h4>Item {index + 1}</h4>
                  <button onClick={() => deleteItem(fullPath, index)} className="delete-button">Delete</button>
                </div>
                {renderDocumentStructure(item, `${fullPath}.${index}`)}
              </div>
            ))}
            <button onClick={() => addItem(fullPath)} className="add-button">Add {titleCaseKey}</button>
          </div>
        );
      } else if (typeof value === 'object' && value !== null) {
        return (
          <div key={fullPath} className="nested-section">
            <h3>{titleCaseKey}</h3>
            {renderDocumentStructure(value, fullPath)}
          </div>
        );
      } else {
        return (
          <div key={fullPath} className="input-section">
            <label htmlFor={fullPath}>{titleCaseKey}</label>
            <textarea
              id={fullPath}
              value={getUserInputValue(fullPath)}
              onChange={(e) => handleInputChange(fullPath, e.target.value)}
              placeholder={value}
            />
          </div>
        );
      }
    });
  };

  return (
    <div className="chatbot-container">
      <h1 className="page-title">Document Generator</h1>
      <div className="content-wrapper">
        <div className="chat-section">
          <div className="chat-window">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.fromBot ? 'bot' : 'user'}`}>
                <span className="sender">{msg.fromBot ? 'Bot: ' : 'User: '}</span>{msg.text}
              </div>
            ))}
          </div>
          <form onSubmit={handleUserMessageSubmitWrapper} className="message-form">
            <FileUploadWidget handleFileUpload={handleFileChange} />
            <input
              type="text"
              value={userMessage}
              onChange={handleUserMessageChange}
              placeholder="Type a message..."
              className="message-input"
            />
            <button type="submit" className="message-submit-button">Send</button>
          </form>
        </div>
        {documentStructure && (
          <div className="document-structure">
            <h2>Document Structure</h2>
            <div className="structure-content">
              {renderDocumentStructure(documentStructure)}
            </div>
            <button onClick={handleGenerateDocument} className="generate-button">Generate Document</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatbotPage;