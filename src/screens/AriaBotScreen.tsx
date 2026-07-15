import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthSession } from '../models/onboarding';
import { AriaConversationMessage, AriaHistoryMessage, chatWithAria, getAriaHistory } from '../services/api';
import { colors, fonts } from '../theme/tokens';

type ChatMessage = {
  id: string;
  role: 'user' | 'aria';
  text: string;
  createdAt?: string;
};

type ChatThread = {
  id: string;
  title: string;
  createdAt?: string;
  messages: ChatMessage[];
};

type ThreadGroup = {
  title: string;
  threads: ChatThread[];
};

const SUGGESTED_PROMPT = 'How is my profile? What should I improve?';
const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'aria',
  text: 'Hi, I am Aria. Ask me about your profile, resumes, GitHub, LinkedIn, or what to improve next.',
};
const ariaMessageCache = new Map<string, ChatMessage[]>();

export function AriaBotScreen({ session }: { session?: AuthSession }) {
  const cachedMessages = getCachedAriaMessages(session);
  const [messages, setMessages] = useState<ChatMessage[]>(cachedMessages.length > 0 ? cachedMessages : [WELCOME_MESSAGE]);
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>(cachedMessages);
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const historyThreads = useMemo(() => buildAriaThreads(historyMessages), [historyMessages]);
  const groupedThreads = useMemo(() => groupThreadsByDate(historyThreads), [historyThreads]);

  const loadHistory = async () => {
    if (!session) {
      return;
    }

    try {
      setHistoryLoading(true);
      setError('');
      const history = await getAriaHistory(session);
      const historyMessages = normalizeAriaHistory(history.messages ?? []);
      setHistoryMessages(historyMessages);
      cacheAriaMessages(session, historyMessages);
      setSelectedThreadId(undefined);
      setMessages(historyMessages.length > 0 ? historyMessages : [WELCOME_MESSAGE]);
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'Unable to load Aria chat history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access, session?.user?.student_id]);

  const sendMessage = async () => {
    const message = draft.trim();
    if (!message || loading) {
      return;
    }

    if (!session) {
      setError('Please sign in again to chat with Aria.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: message,
    };

    try {
      setLoading(true);
      setError('');
      setMessages((current) => {
        const nextMessages = [...current, userMessage];
        cacheAriaMessages(session, stripWelcomeMessage(nextMessages));
        return nextMessages;
      });
      setHistoryMessages((current) => {
        const nextMessages = [...current, userMessage];
        cacheAriaMessages(session, nextMessages);
        return nextMessages;
      });
      setSelectedThreadId(undefined);
      setDraft('');

      const conversation = getAriaConversation(stripWelcomeMessage(messages));
      const response = await chatWithAria(session, message, conversation);
      const ariaMessage: ChatMessage = {
        id: `aria-${Date.now()}`,
        role: 'aria',
        text: response.reply || response.message || 'Aria did not return a reply.',
      };
      setMessages((current) => {
        const nextMessages = [...current, ariaMessage];
        cacheAriaMessages(session, stripWelcomeMessage(nextMessages));
        return nextMessages;
      });
      setHistoryMessages((current) => {
        const nextMessages = [...current, ariaMessage];
        cacheAriaMessages(session, nextMessages);
        return nextMessages;
      });
      await loadHistory();
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : 'Unable to chat with Aria');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Aria</Text>
          <Text style={styles.subtitle}>Profile guidance assistant</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSidebarOpen((current) => !current)}
          style={[styles.historyToggle, sidebarOpen && styles.historyToggleActive]}
        >
          <Text style={styles.historyToggleText}>{sidebarOpen ? 'Close' : 'History'}</Text>
        </Pressable>
      </View>
      <View style={styles.container}>
        {sidebarOpen ? (
          <RecentChatSidebar
            groupedThreads={groupedThreads}
            historyLoading={historyLoading}
            selectedThreadId={selectedThreadId}
            onClose={() => setSidebarOpen(false)}
            onRefresh={loadHistory}
            onSelect={(thread) => {
              setSelectedThreadId(thread.id);
              setMessages(thread.messages);
              setSidebarOpen(false);
            }}
          />
        ) : null}

        <ScrollView style={styles.messages} contentContainerStyle={styles.messageContent}>
          {historyLoading ? (
            <View style={[styles.bubble, styles.ariaBubble, styles.loadingBubble]}>
              <ActivityIndicator color={colors.coral} size="small" />
              <Text style={styles.loadingText}>Loading Aria history...</Text>
            </View>
          ) : null}
          {messages.map((message) => (
            <View
              key={message.id}
              style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.ariaBubble]}
            >
              <Text style={styles.bubbleLabel}>{message.role === 'user' ? 'You' : 'Aria'}</Text>
              <Text style={styles.bubbleText}>{message.text}</Text>
              {message.createdAt ? (
                <Text style={styles.messageDate}>{formatChatDate(message.createdAt)}</Text>
              ) : null}
            </View>
          ))}
          {loading ? (
            <View style={[styles.bubble, styles.ariaBubble, styles.loadingBubble]}>
              <ActivityIndicator color={colors.coral} size="small" />
              <Text style={styles.loadingText}>Aria is reading your profile...</Text>
            </View>
          ) : null}
        </ScrollView>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.composer}>
          {!draft.trim() ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setDraft(SUGGESTED_PROMPT)}
              style={styles.suggestionChip}
            >
              <Text style={styles.suggestionText}>{SUGGESTED_PROMPT}</Text>
            </Pressable>
          ) : null}
          <TextInput
            accessibilityLabel="Message Aria"
            multiline
            onChangeText={setDraft}
            placeholder="Ask Aria about your profile..."
            placeholderTextColor="#777895"
            style={styles.input}
            value={draft}
          />
          <Pressable
            accessibilityRole="button"
            disabled={loading || !draft.trim()}
            onPress={sendMessage}
            style={[styles.sendButton, (loading || !draft.trim()) && styles.disabledButton]}
          >
            {loading ? (
              <ActivityIndicator color="#1A0F0A" size="small" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </Pressable>
        </View>
      </View>
    </>
  );
}

function RecentChatSidebar({
  groupedThreads,
  historyLoading,
  selectedThreadId,
  onClose,
  onRefresh,
  onSelect,
}: {
  groupedThreads: ThreadGroup[];
  historyLoading: boolean;
  selectedThreadId?: string;
  onClose: () => void;
  onRefresh: () => void;
  onSelect: (thread: ChatThread) => void;
}) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View>
          <Text style={styles.sidebarTitle}>Recent chats</Text>
          <Text style={styles.sidebarCaption}>Today first, then yesterday and older chats.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.sidebarIconButton}>
          <Text style={styles.sidebarIconText}>x</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={historyLoading}
        onPress={onRefresh}
        style={[styles.refreshButton, historyLoading && styles.disabledButton]}
      >
        {historyLoading ? (
          <ActivityIndicator color={colors.offWhite} size="small" />
        ) : (
          <Text style={styles.refreshText}>Refresh history</Text>
        )}
      </Pressable>

      {groupedThreads.length === 0 && !historyLoading ? (
        <Text style={styles.emptyText}>No recent Aria chats yet.</Text>
      ) : null}

      {groupedThreads.map((group) => (
        <View key={group.title} style={styles.threadGroup}>
          <Text style={styles.threadGroupTitle}>{group.title}</Text>
          {group.threads.map((thread) => (
            <Pressable
              key={thread.id}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedThreadId === thread.id }}
              onPress={() => onSelect(thread)}
              style={[styles.threadItem, selectedThreadId === thread.id && styles.threadItemActive]}
            >
              <Text numberOfLines={2} style={styles.threadTitle}>
                {thread.title}
              </Text>
              {thread.createdAt ? <Text style={styles.threadTime}>{formatChatTime(thread.createdAt)}</Text> : null}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

function normalizeAriaHistory(messages: AriaHistoryMessage[]): ChatMessage[] {
  return messages
    .filter((message) => message.content)
    .map((message, index) => ({
      id: `${message.sender}-${message.created_at ?? index}`,
      role: message.sender === 'user' ? 'user' : 'aria',
      text: message.content,
      createdAt: message.created_at,
    }));
}

function getAriaConversation(messages: ChatMessage[]): AriaConversationMessage[] {
  return messages
    .filter((message) => message.text.trim())
    .slice(-20)
    .map((message) => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.text,
    }));
}

function getAriaCacheKey(session: AuthSession | undefined) {
  return session?.user?.student_id || session?.user?.email || 'guest';
}

function getCachedAriaMessages(session: AuthSession | undefined) {
  return ariaMessageCache.get(getAriaCacheKey(session)) ?? [];
}

function cacheAriaMessages(session: AuthSession | undefined, messages: ChatMessage[]) {
  if (!session) {
    return;
  }

  ariaMessageCache.set(getAriaCacheKey(session), stripWelcomeMessage(messages));
}

function stripWelcomeMessage(messages: ChatMessage[]) {
  return messages.filter((message) => message.id !== WELCOME_MESSAGE.id);
}

function buildAriaThreads(messages: ChatMessage[]): ChatThread[] {
  const threads: ChatThread[] = [];
  let currentThread: ChatThread | undefined;

  messages.forEach((message, index) => {
    const startsThread = message.role === 'user' || !currentThread;
    if (startsThread) {
      currentThread = {
        id: `thread-${message.createdAt ?? index}`,
        title: message.role === 'user' ? getThreadTitle(message.text) : 'Aria update',
        createdAt: message.createdAt,
        messages: [message],
      };
      threads.push(currentThread);
      return;
    }

    const activeThread = currentThread;
    if (activeThread) {
      activeThread.messages = [...activeThread.messages, message];
    }
  });

  return threads.sort((left, right) => getTimeValue(right.createdAt) - getTimeValue(left.createdAt));
}

function groupThreadsByDate(threads: ChatThread[]): ThreadGroup[] {
  const grouped = new Map<string, ChatThread[]>();

  threads.forEach((thread) => {
    const groupTitle = getRelativeDateLabel(thread.createdAt);
    grouped.set(groupTitle, [...(grouped.get(groupTitle) ?? []), thread]);
  });

  return Array.from(grouped.entries()).map(([title, groupedThreads]) => ({
    title,
    threads: groupedThreads,
  }));
}

function getThreadTitle(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return 'New chat';
  }

  return compact.length > 54 ? `${compact.slice(0, 51)}...` : compact;
}

function getRelativeDateLabel(value: string | undefined) {
  const date = getValidDate(value);
  if (!date) {
    return 'Older';
  }

  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const dayDifference = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (dayDifference === 0) {
    return 'Today';
  }
  if (dayDifference === 1) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getValidDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function getTimeValue(value: string | undefined) {
  return getValidDate(value)?.getTime() ?? 0;
}

function formatChatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatChatTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    minHeight: 520,
    padding: 14,
  },
  header: {
    alignItems: 'center',
    backgroundColor: 'rgba(91,141,239,0.10)',
    borderColor: 'rgba(91,141,239,0.18)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#FF6B4A',
    fontFamily: fonts.heading,
    fontSize: 24,
    lineHeight: 29,
  },
  subtitle: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  historyToggle: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  historyToggleActive: {
    backgroundColor: 'rgba(255,107,74,0.14)',
    borderColor: 'rgba(255,107,74,0.32)',
  },
  historyToggleText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  sidebar: {
    backgroundColor: '#141634',
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
    padding: 12,
  },
  sidebarHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  sidebarTitle: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 18,
    lineHeight: 23,
  },
  sidebarCaption: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  sidebarIconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  sidebarIconText: {
    color: colors.textSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  refreshText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  emptyText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  threadGroup: {
    gap: 8,
  },
  threadGroupTitle: {
    color: '#A6A7C2',
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  threadItem: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  threadItemActive: {
    backgroundColor: 'rgba(255,107,74,0.14)',
    borderColor: 'rgba(255,107,74,0.30)',
  },
  threadTitle: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  threadTime: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  messages: {
    maxHeight: 360,
  },
  messageContent: {
    gap: 10,
    paddingBottom: 2,
  },
  bubble: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 11,
  },
  ariaBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(91,141,239,0.10)',
    borderColor: 'rgba(91,141,239,0.20)',
    maxWidth: '92%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,107,74,0.16)',
    borderColor: 'rgba(255,107,74,0.26)',
    maxWidth: '92%',
  },
  loadingBubble: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  bubbleLabel: {
    color: '#A6A7C2',
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  bubbleText: {
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  messageDate: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
  },
  loadingText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  composer: {
    gap: 10,
  },
  suggestionChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,107,74,0.12)',
    borderColor: 'rgba(255,107,74,0.28)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  suggestionText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.panelInk,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 86,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 50,
  },
  disabledButton: {
    opacity: 0.55,
  },
  sendText: {
    color: '#1A0F0A',
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
});
