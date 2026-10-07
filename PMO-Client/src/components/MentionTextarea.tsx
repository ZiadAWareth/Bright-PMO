'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Spinner } from "@/components/ui/spinner";

interface TeamMember {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  avatar?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  projectId: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

interface MentionSuggestion {
  id: string;
  display: string;
  username: string;
}

const MentionTextarea: React.FC<MentionTextareaProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Add a comment...",
  projectId,
  disabled = false,
  rows = 3,
  className = ""
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const [mentionQuery, setMentionQuery] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!projectId) {
        console.warn('MentionTextarea: No projectId provided');
        return;
      }
      
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/projects/${projectId}/team-members`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('MentionTextarea: Fetched team members', data?.length || 0);
          setTeamMembers(data || []);
        } else {
          console.error('MentionTextarea: Failed to fetch team members', response.status, response.statusText);
          setTeamMembers([]);
        }
      } catch (error) {
        console.error('MentionTextarea: Error fetching team members:', error);
        setTeamMembers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamMembers();
  }, [projectId]);

  // Create mention suggestions
  const mentionOptions = useMemo(() => {
    return teamMembers.map((member: TeamMember) => ({
      id: member.username,
      display: member.display_name,
      username: member.username
    }));
  }, [teamMembers]);

  // Handle text changes and detect mentions
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    onChange(newValue);
    
    // Find the last @ before the cursor (but not inside an existing formatted mention)
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    
    // Check if we're inside a formatted mention @[DisplayName](username)
    // Look backwards from cursor to see if we're inside brackets or parentheses
    const beforeCursor = textBeforeCursor;
    const lastOpenBracket = beforeCursor.lastIndexOf('[');
    const lastCloseBracket = beforeCursor.lastIndexOf(']');
    const lastOpenParen = beforeCursor.lastIndexOf('(');
    const lastCloseParen = beforeCursor.lastIndexOf(')');
    
    // If we're inside brackets or parentheses, we're in a formatted mention - don't show dropdown
    const isInsideFormattedMention = 
      (lastOpenBracket > lastCloseBracket) || // Inside brackets
      (lastOpenParen > lastCloseParen && lastCloseBracket > lastOpenParen); // Inside parentheses after brackets
    
    if (isInsideFormattedMention) {
      setShowSuggestions(false);
      setMentionStart(-1);
      setMentionQuery('');
      return;
    }
    
    // Look for @ that's not part of @[DisplayName](username) format
    // Match @ followed by optional word characters, but stop at [ or ( or space or newline
    const mentionMatch = textBeforeCursor.match(/@([\w]*?)(?=\s|\[|\(|\n|$)/);
    
    if (mentionMatch && mentionOptions.length > 0) {
      const start = cursorPosition - mentionMatch[0].length;
      const query = mentionMatch[1] || '';
      
      setMentionStart(start);
      setMentionQuery(query);
      
      // Filter suggestions based on query (show all if query is empty)
      const filteredSuggestions = query.length > 0
        ? mentionOptions.filter((option: MentionSuggestion) =>
            option.display.toLowerCase().includes(query.toLowerCase()) ||
            option.username.toLowerCase().includes(query.toLowerCase())
          )
        : mentionOptions; // Show all when just @ is typed
      
      setSuggestions(filteredSuggestions);
      setShowSuggestions(filteredSuggestions.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setMentionStart(-1);
      setMentionQuery('');
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
      }
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Insert mention into text
  const insertMention = (suggestion: MentionSuggestion) => {
    if (!textareaRef.current || !suggestion) return;
    
    const textarea = textareaRef.current;
    const currentValue = value;
    const cursorPosition = textarea.selectionStart;
    
    // Replace @query with @[DisplayName](username)
    const beforeMention = currentValue.substring(0, mentionStart);
    const afterMention = currentValue.substring(cursorPosition);
    const mentionText = `@[${suggestion.display}](${suggestion.username}) `; // Add space after mention
    
    const newValue = beforeMention + mentionText + afterMention;
    const newCursorPosition = mentionStart + mentionText.length;
    
    // Close dropdown immediately
    setShowSuggestions(false);
    setMentionStart(-1);
    setMentionQuery('');
    
    onChange(newValue);
    
    // Set cursor position after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: MentionSuggestion) => {
    insertMention(suggestion);
  };

  // Calculate suggestion position - position below textarea
  const getSuggestionPosition = () => {
    if (!textareaRef.current || mentionStart === -1) return { top: '100%', left: '0', marginTop: '4px' };
    
    const textarea = textareaRef.current;
    const textBeforeMention = value.substring(0, mentionStart);
    const lines = textBeforeMention.split('\n');
    const currentLine = lines.length - 1;
    const currentLineText = lines[currentLine];
    
    // Calculate approximate position
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20;
    const paddingLeft = parseFloat(getComputedStyle(textarea).paddingLeft) || 12;
    
    // Estimate character width
    const fontSize = parseFloat(getComputedStyle(textarea).fontSize) || 14;
    const charWidth = fontSize * 0.6;
    
    // Position dropdown below the textarea, aligned with the @ symbol
    const left = currentLineText.length * charWidth + paddingLeft;
    
    return {
      top: '100%',
      left: `${Math.max(0, left)}px`,
      marginTop: '4px',
      position: 'absolute' as const
    };
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSuggestions]);

  return (
    <div className={`relative ${className}`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent resize-none"
        style={{ fontFamily: 'inherit', fontSize: 'inherit' }}
      />
      
      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 bg-surface border border-line rounded-lg shadow-xl max-h-60 overflow-y-auto"
          style={{
            ...getSuggestionPosition(),
            minWidth: '280px',
            maxWidth: '320px',
            transform: 'translateY(0)'
          }}
        >
          {suggestions.map((suggestion: MentionSuggestion, index: number) => (
            <div
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`px-3 py-2 cursor-pointer text-sm ${
                index === selectedIndex
                  ? 'bg-info-soft text-info '
                  : 'hover:bg-surface-2 text-ink'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-info flex items-center justify-center text-white text-xs font-medium">
                  {suggestion.display.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                </div>
                <div>
                  <div className="font-medium">{suggestion.display}</div>
                  <div className="text-xs text-muted">@{suggestion.username}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-3">
          <Spinner size={16} />
        </div>
      )}
    </div>
  );
};

export default MentionTextarea; 