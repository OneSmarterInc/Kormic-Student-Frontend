import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthSession } from '../models/onboarding';
import {
  chatWithUniversityAgent,
  getUniversityAgentHistory,
  UniversityChatResponse,
  UniversityHistoryMessage,
} from '../services/api';
import { colors, fonts } from '../theme/tokens';

type UniversityOption = {
  id: string;
  label: string;
  agent: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt?: string;
  meta?: {
    pending?: boolean;
    query_id?: string | number | null;
    confidence?: number | null;
  };
};

const UNIVERSITIES: UniversityOption[] = [
  { id: 'wright_state_cs', label: 'Wright State CS', agent: 'Raider' },
  { id: 'franklin_cs', label: 'Franklin CS', agent: 'Raider' },
];

const DEFAULT_UNIVERSITY = UNIVERSITIES[0] as UniversityOption;

export function UniversityAgentScreen({ session }: { session?: AuthSession }) {
  const [selectedUniversityId, setSelectedUniversityId] = useState(DEFAULT_UNIVERSITY.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const selectedUniversity = useMemo(
    () => UNIVERSITIES.find((university) => university.id === selectedUniversityId) ?? DEFAULT_UNIVERSITY,
    [selectedUniversityId],
  );

  const loadHistory = async () => {
    if (!session) {
      setError('Please sign in again to chat with a university agent.');
      return;
    }

    try {
      setHistoryLoading(true);
      setError('');
      const history = await getUniversityAgentHistory(session, selectedUniversity.id);
      setMessages(normalizeHistory(history.messages ?? []));
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'Unable to load university chat history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUniversity.id, session?.access, session?.user?.student_id]);

  const sendMessage = async () => {
    const message = draft.trim();

    if (!message || sending) {
      return;
    }

    if (!session) {
      setError('Please sign in again to chat with a university agent.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: message,
    };

    try {
      setSending(true);
      setError('');
      setDraft('');
      setMessages((current) => [...current, userMessage]);
      const response = await chatWithUniversityAgent(session, selectedUniversity.id, message);
      setMessages((current) => [...current, normalizeResponse(response)]);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : 'Unable to chat with university agent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>University agent</Text>
        <Text style={styles.heroText}>Ask university-specific questions about admissions, GPA, GRE, programs, and fit.</Text>
      </View>

      <View style={styles.selectorCard}>
        <Text style={styles.label}>Select university</Text>
        <View style={styles.selectorRow}>
          {UNIVERSITIES.map((university) => {
            const active = university.id === selectedUniversity.id;
            return (
              <Pressable
                key={university.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSelectedUniversityId(university.id)}
                style={[styles.selectorButton, active && styles.selectorButtonActive]}
              >
                <Text style={[styles.selectorText, active && styles.selectorTextActive]}>{university.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.agentMeta}>Agent: {selectedUniversity.agent}</Text>
      </View>

      <View style={styles.chatCard}>
        <View style={styles.chatHeader}>
          <View>
            <Text style={styles.chatTitle}>{selectedUniversity.label}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={loadHistory}
            disabled={historyLoading || sending}
            style={styles.refreshButton}
          >
            {historyLoading ? <ActivityIndicator color={colors.offWhite} size="small" /> : <Text style={styles.refreshText}>Refresh</Text>}
          </Pressable>
        </View>

        <ScrollView style={styles.messages} contentContainerStyle={styles.messageContent}>
          {historyLoading && messages.length === 0 ? (
            <View style={[styles.bubble, styles.assistantBubble]}>
              <ActivityIndicator color={colors.coral} size="small" />
              <Text style={styles.loadingText}>Loading history...</Text>
            </View>
          ) : null}

          {!historyLoading && messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>Try asking about minimum GPA, GRE expectations, funding, or program fit.</Text>
            </View>
          ) : null}

          {messages.map((message) => (
            <View key={message.id} style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={styles.bubbleLabel}>{message.role === 'user' ? 'You' : selectedUniversity.agent}</Text>
              <Text style={styles.bubbleText}>{message.text}</Text>
              {message.createdAt ? <Text style={styles.messageDate}>{formatDate(message.createdAt)}</Text> : null}
              {message.role === 'assistant' ? <MessageMeta meta={message.meta} /> : null}
            </View>
          ))}

          {sending ? (
            <View style={[styles.bubble, styles.assistantBubble]}>
              <ActivityIndicator color={colors.coral} size="small" />
              <Text style={styles.loadingText}>{selectedUniversity.agent} is checking...</Text>
            </View>
          ) : null}
        </ScrollView>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={(value) => {
              setError('');
              setDraft(value);
            }}
            editable={!sending}
            placeholder="Ask about GPA, GRE, deadlines..."
            placeholderTextColor={colors.muted}
            multiline
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!draft.trim() || sending}
            onPress={sendMessage}
            style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
          >
            {sending ? <ActivityIndicator color={colors.ink} size="small" /> : <Text style={styles.sendText}>Send</Text>}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function normalizeHistory(messages: UniversityHistoryMessage[]): ChatMessage[] {
  return messages
    .map((message, index) => {
      const role: ChatMessage['role'] = message.sender === 'user' ? 'user' : 'assistant';
      return {
        id: `${role}-${message.created_at ?? index}-${index}`,
        role,
        text: message.content ?? '',
        createdAt: message.created_at,
        meta: message.meta,
      };
    })
    .filter((message) => message.text.trim().length > 0);
}

function normalizeResponse(response: UniversityChatResponse): ChatMessage {
  return {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    text: response.reply || response.message || 'The university agent did not return a reply.',
    meta: {
      pending: response.pending,
      query_id: response.query_id,
      confidence: response.confidence,
    },
  };
}

function MessageMeta({ meta }: { meta?: ChatMessage['meta'] }) {
  if (!meta) {
    return null;
  }

  const details = [
    typeof meta.confidence === 'number' ? `Confidence ${Math.round(meta.confidence * 100)}%` : '',
    meta.pending ? 'Pending follow-up' : '',
    meta.query_id ? `Query ${meta.query_id}` : '',
  ].filter(Boolean);

  if (details.length === 0) {
    return null;
  }

  return <Text style={styles.messageMeta}>{details.join(' • ')}</Text>;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 28,
  },
  hero: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    borderRadius: 8,
    padding: 16,
  },
  heroTitle: {
    color: '#FF6B4A',
    fontFamily: fonts.heading,
    fontSize: 24,
  },
  heroText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  selectorCard: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
  label: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectorButton: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ink,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectorButtonActive: {
    borderColor: colors.coral,
    backgroundColor: 'rgba(255,107,74,0.16)',
  },
  selectorText: {
    color: colors.textSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  selectorTextActive: {
    color: colors.coral,
  },
  agentMeta: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  chatCard: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    borderRadius: 8,
    padding: 14,
    minHeight: 520,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  chatTitle: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 19,
  },
  refreshButton: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  messages: {
    maxHeight: 440,
  },
  messageContent: {
    gap: 10,
    paddingVertical: 4,
  },
  bubble: {
    borderRadius: 8,
    padding: 12,
    gap: 5,
  },
  userBubble: {
    backgroundColor: 'rgba(255,107,74,0.16)',
    borderWidth: 1,
    borderColor: colors.coral,
  },
  assistantBubble: {
    backgroundColor: colors.panelInk,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bubbleLabel: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  bubbleText: {
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  messageDate: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  messageMeta: {
    color: colors.connectionBlue,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  loadingText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.ink,
  },
  emptyTitle: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  emptyText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.ink,
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendButton: {
    minHeight: 46,
    minWidth: 76,
    borderRadius: 999,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sendButtonDisabled: {
    opacity: 0.55,
  },
  sendText: {
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
});
