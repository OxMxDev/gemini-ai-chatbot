import { useState, useEffect, useRef } from "react";
import { Send, RotateCw, User as UserIcon, MessageSquare } from "lucide-react";

const App = () => {
	// State for messages, with a clear separation for human and AI users
	const [messages, setMessages] = useState([]);
	const [newMessage, setNewMessage] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const messagesEndRef = useRef(null);

	// Define a human and an AI persona
	const humanUser = { uid: "human", name: "You" };
	const aiUser = { uid: "gemini", name: "Gemini" };

	// Scroll to the latest message whenever messages state changes
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const getGeminiResponse = async (userMessage) => {
		setIsTyping(true);

		// The prompt for the AI to act as a friendly chatbot
		const prompt = `You are a friendly and helpful chatbot named Gemini. Respond to the following message in a conversational tone. Do not use any markdown formatting. User: "${userMessage}"`;

		const payload = {
			contents: [{ parts: [{ text: prompt }] }],
			model: "gemini-2.5-flash-preview-05-20",
		};

		// A reusable function for robust API calls with exponential backoff
		const retryFetch = async (url, options, retries = 5) => {
			let delay = 1000;
			for (let i = 0; i < retries; i++) {
				try {
					const response = await fetch(url, options);
					if (response.status === 429) {
						console.warn(`Rate limit exceeded, retrying in ${delay}ms...`);
						await new Promise((res) => setTimeout(res, delay));
						delay *= 2;
						continue;
					}
					if (!response.ok) {
						const errorText = await response.text();
						throw new Error(
							`HTTP error! status: ${response.status} - ${errorText}`
						);
					}
					return await response.json();
				} catch (error) {
					if (i === retries - 1) throw error;
				}
			}
		};

		try {
			const apiKey = "AIzaSyBpYdBKTs_KYb_uyF2R7UGI3TBihOIgKJU";
			const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

			const result = await retryFetch(apiUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const aiText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

			if (aiText) {
				const aiMessage = {
					text: aiText,
					senderId: aiUser.uid,
					senderName: aiUser.name,
					timestamp: new Date(),
				};
				setMessages((prevMessages) => [...prevMessages, aiMessage]);
			} else {
				console.error("API returned no text content:", result);
				const errorMessage = {
					text: "I'm sorry, I couldn't generate a response. Please try again.",
					senderId: aiUser.uid,
					senderName: aiUser.name,
					timestamp: new Date(),
				};
				setMessages((prevMessages) => [...prevMessages, errorMessage]);
			}
		} catch (e) {
			console.error("Gemini API call failed:", e);
			const errorMessage = {
				text: "I'm sorry, I couldn't generate a response. Please try again.",
				senderId: aiUser.uid,
				senderName: aiUser.name,
				timestamp: new Date(),
			};
			setMessages((prevMessages) => [...prevMessages, errorMessage]);
		} finally {
			setIsTyping(false);
		}
	};

	const sendMessage = (e) => {
		e.preventDefault();
		if (newMessage.trim() === "" || isTyping) return;

		// Add user's message to the chat
		const newChatMessage = {
			text: newMessage,
			senderId: humanUser.uid,
			senderName: humanUser.name,
			timestamp: new Date(),
		};
		setMessages([...messages, newChatMessage]);
		setNewMessage("");

		// Get a response from the Gemini API
		getGeminiResponse(newMessage);
	};

	return (
		<div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-inter">
			<style>
				{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        .chat-message-sent { @apply bg-green-500 text-white rounded-bl-xl rounded-tl-xl rounded-tr-xl; }
        .chat-message-received { @apply bg-gray-700 text-gray-100 rounded-br-xl rounded-tr-xl rounded-tl-xl; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        `}
			</style>
			<header className="p-4 shadow-md bg-gray-800 text-center">
				<h1 className="text-xl md:text-3xl font-bold text-green-400">
					AI Chatbot
				</h1>
				<p className="text-sm text-gray-500 mt-1">
					Chat with a conversational AI model.
				</p>
			</header>

			{/* Chat Messages Section */}
			<div className="flex-1 p-4 overflow-y-auto">
				{messages.map((msg, index) => (
					<div
						key={index}
						className={`flex mb-4 items-end ${
							msg.senderId === humanUser.uid ? "justify-end" : "justify-start"
						}`}
					>
						<div
							className={`max-w-xs md:max-w-md p-3 shadow-lg break-words
              ${
								msg.senderId === humanUser.uid
									? "chat-message-sent"
									: "chat-message-received"
							}`}
						>
							<p className="font-bold text-sm mb-1">{msg.senderName}</p>
							<p>{msg.text}</p>
							<span className="block text-right text-xs text-gray-400 mt-2">
								{new Date(msg.timestamp).toLocaleTimeString()}
							</span>
						</div>
					</div>
				))}
				{isTyping && (
					<div className="flex justify-start mb-4 items-end">
						<div className="max-w-xs md:max-w-md p-3 shadow-lg bg-gray-700 text-gray-100 rounded-br-xl rounded-tr-xl rounded-tl-xl">
							<p className="font-bold text-sm mb-1">{aiUser.name}</p>
							<div className="flex items-center space-x-2">
								<RotateCw size={16} className="spinner" />
								<span>Typing...</span>
							</div>
						</div>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Message Input Form */}
			<form
				onSubmit={sendMessage}
				className="flex p-4 border-t border-gray-700 bg-gray-800"
			>
				<input
					type="text"
					value={newMessage}
					onChange={(e) => setNewMessage(e.target.value)}
					placeholder={isTyping ? "Gemini is typing..." : "Type a message..."}
					className="flex-1 p-3 rounded-l-lg bg-gray-700 text-white border-none focus:outline-none focus:ring-2 focus:ring-green-400"
					disabled={isTyping}
				/>
				<button
					type="submit"
					disabled={isTyping}
					className="p-3 bg-green-500 text-white rounded-r-lg font-semibold transition-colors duration-200 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
				>
					<Send size={24} />
				</button>
			</form>
		</div>
	);
};

export default App;
