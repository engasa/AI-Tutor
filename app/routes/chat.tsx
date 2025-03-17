// Code for the chat page
// If question ID is not specified, this page servers as a default chatbot where the user can ask the AI any questions.
// If a question ID is specified, the AI will answer the question based on the question details.
// Default instruction will be applied when the AI answers user's questions.

// Author: Jerry Fan
// Date: 4/30/2024
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
//import remarkGfm from "remark-gfm";
import Message from "./Message";
import OpenAI from "openai";
import { MessageDto } from "./MessageDto";
import { Form, Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { useUser } from "~/utils";
import {
  getInstructionList,
  createInstruction,
  deleteInstruction,
  setDefaultInstruction,
  getDefaultInstruction,
  Instruction,
} from "~/models/instruction.server";
import { LoaderFunction, json } from "@remix-run/node";
import { Question, getQuestion } from "~/models/question.server";
import hljs from "highlight.js"; // This is the library that will highlight the code in the chat
import "highlight.js/styles/github.css"; // This style is just an example, you can choose any style from the available ones; The purpose is to highlight the code in the chat

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const defaultInstruction = await getDefaultInstruction();
  const questionId = url.searchParams.get("questionId");

  // Prepare a response structure with default values
  let response = {
    questionBody: "",
    instructionContent:
      defaultInstruction?.content || "Default instruction content not found.",
  };

  if (questionId) {
    const questionDetails = await getQuestion({ id: questionId });

    if (questionDetails) {
      // If question details are found, override the default response values
      response = {
        questionBody: questionDetails.body,
        instructionContent:
          questionDetails.instruction?.content ||
          defaultInstruction?.content ||
          "Default instruction content not found.",
      };
    }
  }

  return json(response);
};

const Chat: React.FC = () => {
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [messages, setMessages] = useState<Array<MessageDto>>(
    new Array<MessageDto>(),
  );
  const [input, setInput] = useState<string>("");
  const [assistant, setAssistant] = useState<any>(null);
  const [thread, setThread] = useState<any>(null);
  const [openai, setOpenai] = useState<any>(null);
  const [files, setFiles] = useState<File[]>([]);

  const user = useUser();
  const { questionBody, instructionContent } = useLoaderData<typeof loader>();

  // Below is the code for fetching files from the server
  // However, this code is not fully working, as to access server files in assitant API is not implemented
  // It is commented out for now and only server as a reference

  // useEffect(() => {
  //   // Fetch files when the component mounts
  //   const fetchFiles = async () => {
  //     try {
  //       const response = await fetch('/files');
  //       if (!response.ok) throw new Error('Failed to fetch files');
  //       const data = await response.json();
  //       setFiles(data.files); // Assume your API returns an object with a 'files' array
  //     } catch (error) {
  //       console.error('Error fetching files:', error);
  //     }
  //   };

  //   fetchFiles();
  // }, []);

  // The code below is ultilizing the OpenAI Assistants API to create a chatbot where an instruciton can be assigned to it
  useEffect(() => {
    initChatBot();
  }, []); // Initialize the chatbot when the component mounts

  useEffect(() => {
    setMessages([
      {
        content: "Hi, I'm your personal assistant. How can I help you?",
        isUser: false,
      },
    ]);
  }, [assistant]); // Set the initial message when the assistant is initialized

  useEffect(() => {
    // Set the textarea's content to questionBody when the component mounts or questionBody changes
    setInput(questionBody || "");
  }, [questionBody]);

  // IMPORTANT: API key must be filled in for the chatbot to work
  // The API key is not included in the code snippet for security reasons
  // It is possible to save the key inside the .env file and access it using process.env.API_KEY
  const initChatBot = async () => {
    console.log("Initializing chatbot...");
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
      defaultHeaders: { "OpenAI-Beta": "assistants=v2" },
    });
    console.log("OpenAI instance created.");
    console.log("API Key:", openai.apiKey ? "Exists" : "MISSING");
    // Create an assistant
    const assistant = await openai.beta.assistants.create({
      name: "Computer Science Expert",
      instructions: instructionContent,
      model: "gpt-4-turbo",
    });

    // Create a thread
    const thread = await openai.beta.threads.create();

    setOpenai(openai);
    setAssistant(assistant);
    setThread(thread);
  };

  // Create a new message object
  const createNewMessage = (content: string, isUser: boolean) => {
    const newMessage = new MessageDto(isUser, content);
    return newMessage;
  };

  // Send a message to the chatbot
  const handleSendMessage = async () => {
    if (!openai || !thread || !assistant) {
      console.error("Chatbot not initialized yet!");
      return;
    }

    messages.push(createNewMessage(input, true));
    setMessages([...messages]);
    setInput("");

    // Send a message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: input,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    // Create a response
    let response = await openai.beta.threads.runs.retrieve(thread.id, run.id);

    // Wait for the response to be ready
    while (response.status === "in_progress" || response.status === "queued") {
      console.log("waiting...");
      setIsWaiting(true);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      response = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }
    console.log("finished waiting for response");
    setIsWaiting(false);

    // Get the messages for the thread
    const messageList = await openai.beta.threads.messages.list(thread.id);

    console.log("Full message list:", messageList.data); // <-- Add this line to inspect the response

    console.log("response:", response); // <-- Add this line to inspect the response

    // Find the last message for the current run
    const lastMessage = messageList.data
      .filter(
        (message: any) =>
          message.run_id === run.id && message.role === "assistant",
      )
      .pop();
    console.log("got the last message");
    console.log("Last message:", lastMessage);

    // Print the last message coming from the assistant
    if (lastMessage) {
      console.log("entered if of last message");
      console.log(lastMessage.content[0]["text"].value);
      setMessages([
        ...messages,
        createNewMessage(lastMessage.content[0]["text"].value, false),
      ]);
    }
  };

  // detect enter key and send message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  /**
  const renderMessageContent = (message: MessageDto) => {
    // Split the message content by ``` to find code blocks
    //const parts = message.content.split(/(```[\s\S]*?```)/);

    // 1. Replace newlines with <br> tags
    const contentWithLineBreaks = message.content.replace(/\n/g, "<br />");

    // 2. Split the message content to find code blocks (if needed)
    const parts = contentWithLineBreaks.split(/([\s\S]*?)/);

    return (
      <div className={message.isUser ? "user-message" : "chatbot-message"}>
        {parts.map((part, index) => {
          if (part.startsWith("```") && part.endsWith("```")) {
            // Extract code from between the backticks
            const code = part.slice(3, -3);
            // Use highlight.js to highlight code
            const highlightedCode = hljs.highlightAuto(code).value;
            // Render the highlighted code within a pre and code block
            return (
              <pre
                key={index}
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
              />
            );
          } else {
            // Render non-code parts as regular text
            //return <span key={index}>{part}</span>;
            return (
              <span key={index} dangerouslySetInnerHTML={{ __html: part }} />
            );
          }
        })}
      </div>
    );
  };
*/

  const renderMessageContent = (message: MessageDto) => {
    // 1. Replace newlines with <br> tags
    const contentWithLineBreaks = message.content.replace(/\n/g, "<br />");

    return (
      <div className={message.isUser ? "user-message" : "chatbot-message"}>
        <span dangerouslySetInnerHTML={{ __html: contentWithLineBreaks }} />
      </div>
    );
  };

  //Code for TLDR formatting in AI's response
  /**
  const renderMessageContent = (message: MessageDto) => {
    // Split the message content by ``` to find code blocks
    const parts = message.content.split(/(```[\s\S]*?```)/);

    return (
      <div className={message.isUser ? "user-message" : "chatbot-message"}>
        {parts.map((part, index) => {
          if (part.startsWith("```") && part.endsWith("```")) {
            // Extract code from between the backticks
            const code = part.slice(3, -3);
            const highlightedCode = hljs.highlightAuto(code).value;

            return (
              <pre key={index}>
                <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
              </pre>
            );
          } else {
            // Render Markdown content
            return (
              <ReactMarkdown key={index} remarkPlugins={[remarkGfm]}>
                {part}
              </ReactMarkdown>
            );
          }
        })}
      </div>
    );
  };
*/

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="flex items-center justify-between bg-slate-800 p-4 text-white">
        <h1 className="text-3xl font-bold">
          <Link to="/">AICADEMY</Link>
        </h1>
        <p>
          {user.userType}: {user.email}
        </p>
        <Form action="/logout" method="post">
          <Link to="/home">
            <button
              type="button"
              className="mr-2 rounded-md bg-white px-4 py-2 text-base font-medium text-blue-700 shadow-sm hover:bg-blue-50"
            >
              Home
            </button>
          </Link>
          <button
            type="submit"
            className="rounded-md bg-blue-500 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Logout
          </button>
        </Form>
      </header>

      <div style={{ padding: "30px" }}>
        {/* Message display area */}
        <div
          style={{ marginBottom: "20px", borderBottom: "2px solid #007bff" }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                alignSelf: message.isUser ? "flex-end" : "flex-start",
                backgroundColor: message.isUser ? "#f0f0f0" : "#e1f5fe",
                padding: "10px",
                borderRadius: "4px",
                margin: "5px 0",
              }}
            >
              {renderMessageContent(message)}
            </div>
          ))}
        </div>

        {/* Input area */}
        <div
          style={{
            backgroundColor: "#f7f7f7",
            padding: "15px",
            borderRadius: "4px",
          }}
        >
          <textarea
            placeholder="Type your message here..."
            disabled={isWaiting}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              marginBottom: "10px",
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={15}
          ></textarea>
          {isWaiting && (
            <div style={{ height: "4px", backgroundColor: "#007bff" }}></div>
          )}
          {!isWaiting && (
            <button
              onClick={handleSendMessage}
              disabled={isWaiting}
              style={{
                backgroundColor: "#007bff",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
