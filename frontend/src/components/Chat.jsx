import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const downloadMessageAsPDF = (content, index) => {
    
    // Convert markdown to plain text (remove markdown syntax)
    const plainText = content
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1'); // Remove code
    
    const blob = new Blob([plainText], { 
      type: 'text/plain;charset=utf-8' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'message.txt';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  
  };

function Chat({ onLocationSearch, agentType, initialMessage, agentInitials, directQuestion }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [processedQuestions, setProcessedQuestions] = useState([]);
  const [usePdf, setUsePdf] = useState(false);

  const handleToggle = (e) => {
    setUsePdf(e.target.checked);
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const handleSendMessage = useCallback(
    async (questionOverride = null) => {
      const messageToSend = questionOverride || input;

      if (!messageToSend.trim()) return; //empty message

      const userMessage = {
        content: messageToSend,
        isUser: true
      }; 

      setMessages((prev) => [...prev, userMessage]); //set user message

      if (!questionOverride) {
        setInput("");
      }

      setIsLoading(true);

      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/${agentType}`,
          {
            message: messageToSend,
            usePdf: usePdf
          },
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
        if (onLocationSearch && response.data.destination) {
            onLocationSearch(response.data.destination);
        }
        console.log("destination sent to map")
        console.log(response.data.destination)

        if (response.data && response.data.response) {
          setMessages((prev) => [
            ...prev,
            {
              content: response.data.response,
              isUser: false,
            },
          ]);
          
        }
      } catch (error) {
        console.error("Error sending message:", error);
        setMessages((prev) => [
          ...prev,
          {
            content:
              "Sorry, there was an error connecting to the AI agent. Please try reloading...",
            isUser: false,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, agentType, API_BASE_URL]
  );

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const cleanQuestion = (question) => {
    return question.replace(/\s*\[\d+\]\s*$/, "");
  };

  useEffect(() => {
    if (initialMessage) {
      setMessages([
        {
          content: initialMessage,
          isUser: false,
        },
      ]);
    }
  }, [initialMessage]);


    useEffect(() => {
    if (
      directQuestion &&
      directQuestion.trim() !== "" &&
      !processedQuestions.includes(directQuestion)
    ) {
      const cleanedQuestion = cleanQuestion(directQuestion);
      setInput(cleanedQuestion);
      handleSendMessage(cleanedQuestion);
      setProcessedQuestions((prev) => [...prev, directQuestion]);
    }
  }, [directQuestion, processedQuestions, handleSendMessage]);

  const renderContent = (content) => {
    let formattedContent = content;

    formattedContent = formattedContent.replace(
      /#{6}\s+(.*?)(?=\n|$)/g,
      "<h6>$1</h6>"
    );
    formattedContent = formattedContent.replace(
      /#{5}\s+(.*?)(?=\n|$)/g,
      "<h5>$1</h5>"
    );
    formattedContent = formattedContent.replace(
      /#{4}\s+(.*?)(?=\n|$)/g,
      "<h4>$1</h4>"
    );
    formattedContent = formattedContent.replace(
      /#{3}\s+(.*?)(?=\n|$)/g,
      "<h3>$1</h3>"
    );
    formattedContent = formattedContent.replace(
      /#{2}\s+(.*?)(?=\n|$)/g,
      "<h2>$1</h2>"
    );
    formattedContent = formattedContent.replace(
      /#{1}\s+(.*?)(?=\n|$)/g,
      "<h1>$1</h1>"
    );

    formattedContent = formattedContent.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

    formattedContent = formattedContent.replace(/\*(.*?)\*/g, "<em>$1</em>");

    formattedContent = formattedContent.replace(/`(.*?)`/g, "<code>$1</code>");

    formattedContent = formattedContent.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank">$1</a>'
    );

    formattedContent = formattedContent.replace(
      /^\s*\*\s+(.*?)(?=\n|$)/gm,
      "<li>$1</li>"
    );
    formattedContent = formattedContent.replace(
      /<li>(.*?)<\/li>(?:\s*<li>.*?<\/li>)*/g,
      "<ul>$&</ul>"
    );

    formattedContent = formattedContent.replace(
      /^\s*\d+\.\s+(.*?)(?=\n|$)/gm,
      "<li>$1</li>"
    );
    formattedContent = formattedContent.replace(
      /<li>(.*?)<\/li>(?:\s*<li>.*?<\/li>)*/g,
      "<ol>$&</ol>"
    );

    return { __html: formattedContent };
  };

  return (
    
  <div className="w-full h-[520px] flex flex-col">
    {/* Chat messages area */}
    <label id="toggleLabel" className="p-2">
        <input
          type="checkbox"
          id="localGuideToggle"
          checked={usePdf}
          onChange={handleToggle}
        />
        {usePdf ? '  Using Local Guide Information (may take longer..)' : '  Not Using Local Guide Information'}
    </label>
    <div
      className="flex-1 overflow-y-auto p-6"
      id={`${agentType}-messages`}
      style={{ minHeight: 0 }}
    >
      {messages.map((message, index) => (
        <div
          key={index}
          className={`mb-6 flex ${message.isUser ? "justify-end" : "justify-start"}`}
        >
          {!message.isUser && (
            <div className="mr-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                {agentInitials || "AI"}
              </div>
            </div>
          )}
          <div className="relative max-w-[70%]">
            <div
              className={`px-3 rounded-lg shadow-sm inline-block align-top break-words ${
                message.isUser
                  ? "bg-blue-600 text-white"
                  : "bg-[#181830] text-gray-200"
              }`}
              style={{
                maxWidth: "100%",
                minWidth: "2.5rem",
                width: "fit-content",
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              <div dangerouslySetInnerHTML={renderContent(message.content)} />
            </div>
            {/* Download PDF button for AI messages */}
            {!message.isUser && (
              <button
                className="absolute -bottom-7 right-0 text-xs bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600 shadow-md"
                onClick={() => downloadMessageAsPDF(message.content, index)}
              >
                Download
              </button>
            )}
          </div>
        </div>
      ))}
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-start mb-4">
          <div className="mr-2">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
              {agentInitials || "AI"}
            </div>
          </div>
          <div className="p-3 rounded-lg shadow-sm bg-[#181830] text-gray-200">
            <span className="loading-dots">...</span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
    {/* Input area */}
    <div className="p-4 bg-gray-900 border-t border-gray-800">
      <div className="flex">
        <input
          type="text"
          id={`${agentType}-input`}
          className="p-2 flex-1 mr-2 border border-gray-700 rounded bg-[#1818340] text-gray-100"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button
          id={`${agentType}-send`}
          className="bg-blue-600 text-white rounded px-4 py-2 cursor-pointer hover:bg-blue-800 border-0"
          onClick={() => handleSendMessage()}
        >
          Send
        </button>
        {/*
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={isLoading}
          style={{
            marginLeft: 8,
            background: recording ? "#f44336" : "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            cursor: "pointer",
          }}
          title={recording ? "Stop Recording" : "Record Audio"}
        >
          {recording ? "■" : "🎤"}
        </button>
        */}
      </div>
    </div>
  </div>
);
}
export default Chat;