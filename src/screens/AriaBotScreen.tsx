import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Image,
  TextInput,
  View,
  Platform,
  AppState,
  Linking,
} from 'react-native';
import { AuthSession } from '../models/onboarding';
import {
  AriaHistoryMessage,
  chatWithAria,
  clearAriaChat,
  getAgentName,
  getAriaHistory,
  updateAgentName,
  AriaAttachment,
  ChatAttachmentFile,
  editAriaMessage,
} from '../services/api';
import { colors, fonts } from '../theme/tokens';
import { ConfirmModal } from '../components/ConfirmModal';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

type ChatMessage = {
  id: string;
  serverId?: number | string;
  role: 'user' | 'aria';
  text: string;
  createdAt?: string;
  editedAt?: string | null;
  attachments?: AriaAttachment[];
  pending?: boolean;
  queryId?: number | null;
  escalationStatus?: 'pending' | 'resolved' | 'ignored' | string | null;
  wasEscalatedPrompt?: boolean;
  confidence?: number | null;
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

export type AriaHeaderCommand = {
  type: 'edit' | 'history';
  id: number;
};

const SUGGESTED_PROMPT = 'How is my profile? What should I improve?';
const SUGGESTED_PROMPTS = [
  SUGGESTED_PROMPT,
  'Which profile gaps should I fix first?',
  'How can I improve my university fit?',
];
const DEFAULT_AGENT_NAME = 'Aria';
const getWelcomeMessage = (agentName: string): ChatMessage => ({
  id: 'welcome',
  role: 'aria',
  text: `Hi, I am ${agentName}. Ask me about your profile, resumes, GitHub, LinkedIn, or what to improve next.`,
});
const ariaMessageCache = new Map<string, ChatMessage[]>();

export function AriaBotScreen({
  session,
  refreshKey = 0,
  onAgentNameChange,
  headerCommand,
  hideHeader = false,
  onHeaderCommandHandled,
}: {
  session?: AuthSession;
  refreshKey?: number;
  onAgentNameChange?: (agentName: string) => void;
  headerCommand?: AriaHeaderCommand;
  onHeaderCommandHandled?: () => void;
  hideHeader?: boolean;
}) {
  const cachedMessages = getCachedAriaMessages(session);
  const [agentName, setAgentName] = useState(DEFAULT_AGENT_NAME);
  const [messages, setMessages] = useState<ChatMessage[]>(
    cachedMessages.length > 0 ? cachedMessages : [getWelcomeMessage(DEFAULT_AGENT_NAME)],
  );
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>(cachedMessages);
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(DEFAULT_AGENT_NAME);
  const [nameSaving, setNameSaving] = useState(false);
  const [error, setError] = useState('');
  const messagesScrollRef = useRef<ScrollView | null>(null);
  const shouldScrollMessagesToEndRef = useRef(true);
  const historyThreads = useMemo(() => buildAriaThreads(historyMessages), [historyMessages]);
  const groupedThreads = useMemo(() => groupThreadsByDate(historyThreads), [historyThreads]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | undefined>();
  const [selectedAttachments, setSelectedAttachments] = useState<ChatAttachmentFile[]>([]);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | undefined>();
  const [editDraft, setEditDraft] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const pickAttachments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
        type: [
          'image/png',
          'image/jpeg',
          'image/webp',
          'image/gif',
          'application/pdf',
          'text/plain',
          'text/markdown',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      });

      if (result.canceled) return;

      setSelectedAttachments((current) =>
        [
          ...current,
          ...result.assets.map((asset) => ({
            uri: asset.uri,
            name: asset.name || 'attachment',
            type: asset.mimeType || 'application/octet-stream',
            size: asset.size,
          })),
        ].slice(0, 5),
      );
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : 'Unable to select attachments.');
    }
  };

  function isImageAttachment(attachment: AriaAttachment) {
    const contentType = attachment.content_type?.toLowerCase() ?? '';
    const filename = attachment.filename?.toLowerCase() ?? '';

    return contentType.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(filename);
  }

  async function openProtectedAttachment(attachment: AriaAttachment, accessToken?: string) {
    if (!attachment.url || !accessToken) return;

    const extension =
      attachment.filename?.split('.').pop() || (attachment.content_type?.includes('pdf') ? 'pdf' : 'file');

    const localPath = `${FileSystem.cacheDirectory}${attachment.id}-${attachment.filename || `attachment.${extension}`}`;

    const download = await FileSystem.downloadAsync(attachment.url, localPath, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(download.uri, {
        mimeType: attachment.content_type,
        dialogTitle: attachment.filename,
      });
    }
  }

  const scrollMessagesToEnd = (animated = true) => {
    requestAnimationFrame(() => {
      messagesScrollRef.current?.scrollToEnd({ animated });
    });
  };

  useEffect(() => {
    shouldScrollMessagesToEndRef.current = true;
  }, [messages.length, loading, historyLoading]);

  const applyAgentName = (nextAgentName: string) => {
    setAgentName(nextAgentName);
    setNameDraft(nextAgentName);
    onAgentNameChange?.(nextAgentName);

    setMessages((current) =>
      current.length === 1 && current[0]?.id === 'welcome' ? [getWelcomeMessage(nextAgentName)] : current,
    );
  };

  const loadAgentName = async () => {
    if (!session) {
      applyAgentName(DEFAULT_AGENT_NAME);
      return DEFAULT_AGENT_NAME;
    }

    try {
      const response = await getAgentName(session);
      const nextAgentName =
        response.agent_name?.trim() || response.agent?.trim() || response.name?.trim() || DEFAULT_AGENT_NAME;
      applyAgentName(nextAgentName);
      return nextAgentName;
    } catch {
      applyAgentName(DEFAULT_AGENT_NAME);
      return DEFAULT_AGENT_NAME;
    }
  };

  const loadHistory = async (nextAgentName = agentName, syncActiveChat = false) => {
    if (!session) return;

    try {
      setHistoryLoading(true);
      setError('');

      const history = await getAriaHistory(session);
      const historyMessages = normalizeAriaHistory(history.messages ?? []);

      setHistoryMessages(historyMessages);
      cacheAriaMessages(session, historyMessages);
      setSelectedThreadId(undefined);

      if (syncActiveChat) {
        setMessages(historyMessages.length > 0 ? historyMessages : [getWelcomeMessage(nextAgentName)]);
      }
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'Unable to load agent chat history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const loadAgent = async () => {
      const nextAgentName = await loadAgentName();
      await loadHistory(nextAgentName, true);
    };

    loadAgent();
  }, [session?.access, session?.user?.student_id, refreshKey]);

  const clearChat = async () => {
    if (!session || clearLoading) {
      return;
    }

    try {
      setClearLoading(true);
      setError('');
      await clearAriaChat(session);

      const welcomeMessage = getWelcomeMessage(agentName);
      setMessages([welcomeMessage]);
      setHistoryMessages([]);
      setSelectedThreadId(undefined);
      setSidebarOpen(false);
      cacheAriaMessages(session, []);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Unable to clear agent chat');
    } finally {
      setClearLoading(false);
    }
  };

  const confirmClearChat = () => {
    if (!session || clearLoading || loading || historyLoading) {
      return;
    }
    setClearConfirmVisible(true);
  };

  const closeClearConfirm = () => {
    if (!clearLoading) {
      setClearConfirmVisible(false);
    }
  };

  const clearConfirmedChat = async () => {
    await clearChat();
    setClearConfirmVisible(false);
  };

  const sendMessage = async () => {
    const message = draft.trim();
    const pendingAttachments = selectedAttachments;

    if ((!message && selectedAttachments.length === 0) || loading) {
      return;
    }

    if (!session) {
      setError(`Please sign in again to chat with ${agentName}.`);
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
      setSelectedAttachments([]);

      const response = await chatWithAria(session, message, pendingAttachments);
      if (response.agent?.trim()) {
        applyAgentName(response.agent.trim());
      }
      const ariaMessage: ChatMessage = {
        id: `aria-${Date.now()}`,
        role: 'aria',
        text: response.reply || response.message || `${response.agent || agentName} did not return a reply.`,
        pending: response.pending === true,
        queryId: typeof response.query_id === 'number' ? response.query_id : null,
        escalationStatus: response.pending === true ? 'pending' : null,
        confidence: typeof response.confidence === 'number' ? response.confidence : null,
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

      await loadHistory(agentName, true);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : `Unable to chat with ${agentName}`);
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = async (message: ChatMessage) => {
    try {
      await Clipboard.setStringAsync(message.text);
      setCopiedMessageId(message.id);

      setTimeout(() => {
        setCopiedMessageId((current) => (current === message.id ? undefined : current));
      }, 1600);
    } catch {
      setError('Unable to copy response.');
    }
  };

  const startEditingMessage = (message: ChatMessage) => {
    if (message.role !== 'user' || !message.serverId) return;
    setEditingMessage(message);
    setEditDraft(message.text);
    setError('');
  };

  const cancelEditingMessage = () => {
    if (editLoading) return;
    setEditingMessage(undefined);
    setEditDraft('');
  };

  const saveEditedMessage = async () => {
    const nextText = editDraft.trim();
    if (!session || !editingMessage?.serverId || !nextText || editLoading) return;

    try {
      setEditLoading(true);
      setError('');
      await editAriaMessage(session, editingMessage.serverId, nextText);
      setEditingMessage(undefined);
      setEditDraft('');
      await loadHistory(agentName, true);
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : 'Unable to edit message.');
    } finally {
      setEditLoading(false);
    }
  };

  const startEditingName = () => {
    setNameDraft(agentName);
    setEditingName(true);
    setError('');
  };

  useEffect(() => {
    if (!headerCommand) {
      return;
    }

    if (headerCommand.type === 'edit') {
      startEditingName();
      onHeaderCommandHandled?.();
      return;
    }

    if (headerCommand.type === 'history') {
      setSidebarOpen((current) => !current);
      onHeaderCommandHandled?.();
    }
  }, [headerCommand?.id]);

  const cancelEditingName = () => {
    setNameDraft(agentName);
    setEditingName(false);
    setError('');
  };

  const saveAgentName = async () => {
    const trimmedName = nameDraft.trim();
    if (!trimmedName || nameSaving) {
      setError('Agent name is required.');
      return;
    }

    if (!session) {
      setError('Please sign in again to edit your agent name.');
      return;
    }

    try {
      setNameSaving(true);
      setError('');
      const response = await updateAgentName(session, trimmedName);
      const nextAgentName =
        response.agent_name?.trim() || response.agent?.trim() || response.name?.trim() || trimmedName;
      applyAgentName(nextAgentName);
      setEditingName(false);
    } catch (nameError) {
      setError(nameError instanceof Error ? nameError.message : 'Unable to update agent name');
    } finally {
      setNameSaving(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        style={styles.chatShell}
      >
        <View style={styles.container}>
          {!sidebarOpen ? (
            <View style={styles.clearChatButtonWrap}>
              <Pressable
                accessibilityRole="button"
                disabled={clearLoading || loading || historyLoading}
                onPress={confirmClearChat}
                accessibilityLabel="Clear chat"
                style={[
                  styles.clearChatButton,
                  (clearLoading || loading || historyLoading) && styles.disabledButton,
                ]}
              >
                {clearLoading ? (
                  <ActivityIndicator color={colors.offWhite} size="small" />
                ) : (
                  <MaterialIcons name="delete-outline" size={19} color={colors.coral} />
                )}
              </Pressable>
            </View>
          ) : null}

          {sidebarOpen ? (
            <RecentChatSidebar
              agentName={agentName}
              groupedThreads={groupedThreads}
              historyLoading={historyLoading}
              selectedThreadId={selectedThreadId}
              onClose={() => setSidebarOpen(false)}
              onRefresh={() => loadHistory(agentName, true)}
              onSelect={(thread) => {
                setSelectedThreadId(thread.id);
                setMessages(thread.messages);
                setSidebarOpen(false);
              }}
            />
          ) : (
            <>
              <ScrollView
                ref={messagesScrollRef}
                style={styles.messages}
                contentContainerStyle={styles.messageContent}
                onContentSizeChange={() => {
                  if (shouldScrollMessagesToEndRef.current) {
                    scrollMessagesToEnd(!historyLoading);
                    shouldScrollMessagesToEndRef.current = false;
                  }
                }}
              >
                {historyLoading ? (
                  <View style={styles.messageRow}>
                    <View style={[styles.bubble, styles.ariaBubble, styles.loadingBubble]}>
                      <ActivityIndicator color={colors.coral} size="small" />
                      <Text style={styles.loadingText}>Loading {agentName} history...</Text>
                    </View>
                  </View>
                ) : null}
                {messages.map((message) => (
                  <View
                    key={message.id}
                    style={[styles.messageRow, message.role === 'user' && styles.userMessageRow]}
                  >
                    <View
                      style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.ariaBubble]}
                    >
                      <Text style={styles.bubbleLabel}>{message.role === 'user' ? 'You' : agentName}</Text>
                      <FormattedMessageText text={message.text} formatBold={message.role === 'aria'} />
                      {message.role === 'aria' && message.escalationStatus === 'pending' ? (
                        <Text style={styles.escalationText}>
                          I'm checking with the university on this. I'll let you know.
                        </Text>
                      ) : null}
                      {message.role === 'aria' && message.escalationStatus === 'resolved' && message.wasEscalatedPrompt ? (
                        <Text style={styles.escalationResolvedText}>Answered by the university.</Text>
                      ) : null}
                      {message.attachments?.length ? (
                        <View style={styles.attachmentList}>
                          {message.attachments.map((attachment) =>
                            isImageAttachment(attachment) && attachment.url ? (
                              <Pressable
                                key={String(attachment.id)}
                                accessibilityRole="imagebutton"
                                onPress={() => openProtectedAttachment(attachment, session?.access)}
                                style={styles.imageAttachmentCard}
                              >
                                <Image
                                  source={{
                                    uri: attachment.url,
                                    headers: session?.access
                                      ? { Authorization: `Bearer ${session.access}` }
                                      : undefined,
                                  }}
                                  style={styles.imageAttachment}
                                  resizeMode="cover"
                                />
                                <Text numberOfLines={1} style={styles.imageAttachmentName}>
                                  {attachment.filename}
                                </Text>
                              </Pressable>
                            ) : (
                              <Pressable
                                key={String(attachment.id)}
                                accessibilityRole="button"
                                onPress={() => openProtectedAttachment(attachment, session?.access)}
                                style={styles.attachmentChip}
                              >
                                <MaterialIcons
                                  name={
                                    attachment.content_type?.includes('pdf')
                                      ? 'picture-as-pdf'
                                      : 'attach-file'
                                  }
                                  size={14}
                                  color={colors.offWhite}
                                />
                                <Text numberOfLines={1} style={styles.attachmentText}>
                                  {attachment.filename}
                                </Text>
                              </Pressable>
                            ),
                          )}
                        </View>
                      ) : null}
                      <View style={styles.botResponse}>
                        {message.createdAt ? (
                          <Text style={styles.messageDate}>{formatChatDate(message.createdAt)}</Text>
                        ) : null}

                        {message.role === 'aria' && message.id !== 'welcome' ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Copy response"
                            onPress={() => copyResponse(message)}
                            style={styles.copyButton}
                          >
                            <MaterialIcons
                              name={copiedMessageId === message.id ? 'check' : 'content-copy'}
                              size={14}
                              color={copiedMessageId === message.id ? colors.coral : colors.textSoft}
                            />
                            <Text
                              style={[
                                styles.copyButtonText,
                                copiedMessageId === message.id && styles.copyButtonTextActive,
                              ]}
                            >
                              {copiedMessageId === message.id ? 'Copied' : ''}
                            </Text>
                          </Pressable>
                        ) : null}

                        {message.role === 'user' && message.serverId ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Edit message"
                            onPress={() => startEditingMessage(message)}
                            style={styles.copyButton}
                          >
                            <MaterialIcons name="edit" size={14} color={colors.textSoft} />
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ))}
                {loading ? (
                  <View style={styles.messageRow}>
                    <View style={[styles.bubble, styles.ariaBubble, styles.loadingBubble]}>
                      <ActivityIndicator color={colors.coral} size="small" />
                      <Text style={styles.loadingText}>{agentName} is reading your profile...</Text>
                    </View>
                  </View>
                ) : null}
              </ScrollView>

              {/* {error ? <Text style={styles.errorText}>{error}</Text> : null} */}

              <View style={styles.composer}>
                {!draft.trim() ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.suggestionScroller}
                    contentContainerStyle={styles.suggestionRow}
                  >
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <Pressable
                        key={prompt}
                        accessibilityRole="button"
                        onPress={() => setDraft(prompt)}
                        style={styles.suggestionChip}
                      >
                        <Text style={styles.suggestionText}>{prompt}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}

                <Modal
                  animationType="fade"
                  transparent
                  visible={editingName}
                  onRequestClose={() => {
                    if (!nameSaving) cancelEditingName();
                  }}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.agentNameModal}>
                      <Text style={styles.modalTitle}>Edit agent name</Text>
                      <Text style={styles.modalCaption}>Update the name shown in your agent chat.</Text>

                      <TextInput
                        accessibilityLabel="Agent name"
                        autoCapitalize="words"
                        editable={!nameSaving}
                        maxLength={100}
                        onChangeText={setNameDraft}
                        placeholder="Agent name"
                        placeholderTextColor="#777895"
                        style={styles.modalInput}
                        value={nameDraft}
                      />

                      <View style={styles.modalActions}>
                        <Pressable
                          accessibilityRole="button"
                          disabled={nameSaving}
                          onPress={cancelEditingName}
                          style={[styles.modalSecondaryButton, nameSaving && styles.disabledButton]}
                        >
                          <Text style={styles.modalSecondaryText}>Cancel</Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          disabled={nameSaving}
                          onPress={saveAgentName}
                          style={[styles.modalPrimaryButton, nameSaving && styles.disabledButton]}
                        >
                          {nameSaving ? (
                            <ActivityIndicator color="#10112A" size="small" />
                          ) : (
                            <Text style={styles.modalPrimaryText}>Save</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Modal>

                <Modal
                  animationType="fade"
                  transparent
                  visible={Boolean(editingMessage)}
                  onRequestClose={cancelEditingMessage}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.agentNameModal}>
                      <Text style={styles.modalTitle}>Edit message</Text>
                      <Text style={styles.modalCaption}>
                        Regenerate the reply from this point in the chat.
                      </Text>
                      <TextInput
                        accessibilityLabel="Edited message"
                        editable={!editLoading}
                        multiline
                        onChangeText={setEditDraft}
                        placeholder="Edit your message"
                        placeholderTextColor="#777895"
                        style={[styles.modalInput, styles.editMessageInput]}
                        value={editDraft}
                      />
                      <View style={styles.modalActions}>
                        <Pressable
                          disabled={editLoading}
                          onPress={cancelEditingMessage}
                          style={styles.modalSecondaryButton}
                        >
                          <Text style={styles.modalSecondaryText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          disabled={editLoading || !editDraft.trim()}
                          onPress={saveEditedMessage}
                          style={styles.modalPrimaryButton}
                        >
                          {editLoading ? (
                            <ActivityIndicator color="#10112A" size="small" />
                          ) : (
                            <Text style={styles.modalPrimaryText}>Save</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Modal>

                <ConfirmModal
                  visible={clearConfirmVisible}
                  title="Clear chat?"
                  message={`This will permanently clear your ${agentName} chat history.`}
                  primaryLabel="Clear chat"
                  secondaryLabel="Cancel"
                  primaryLoading={clearLoading}
                  onPrimary={() => {
                    void clearConfirmedChat();
                  }}
                  onSecondary={closeClearConfirm}
                  onRequestClose={closeClearConfirm}
                />

                {selectedAttachments.length ? (
                  <View style={styles.selectedAttachmentList}>
                    {selectedAttachments.map((attachment, index) => (
                      <View key={`${attachment.name}-${index}`} style={styles.selectedAttachmentChip}>
                        <Text numberOfLines={1} style={styles.selectedAttachmentText}>
                          {attachment.name}
                        </Text>
                        <Pressable
                          onPress={() =>
                            setSelectedAttachments((current) => current.filter((_, i) => i !== index))
                          }
                        >
                          <MaterialIcons name="close" size={14} color={colors.textSoft} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.composerBox}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Attach files"
                    disabled={loading || selectedAttachments.length >= 5}
                    onPress={pickAttachments}
                    style={[
                      styles.attachButton,
                      (loading || selectedAttachments.length >= 5) && styles.disabledButton,
                    ]}
                  >
                    <MaterialIcons name="attach-file" size={20} color={colors.offWhite} />
                  </Pressable>
                  <TextInput
                    accessibilityLabel={`Message ${agentName}`}
                    multiline
                    onChangeText={setDraft}
                    placeholder={`Message ${agentName}...`}
                    placeholderTextColor="#777895"
                    style={styles.input}
                    value={draft}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={loading || (!draft.trim() && selectedAttachments.length === 0)}
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
                <Text style={styles.composerHint}>
                  {agentName} uses your profile, resume, GitHub, and LinkedIn context.
                </Text>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function RecentChatSidebar({
  agentName,
  groupedThreads,
  historyLoading,
  selectedThreadId,
  onClose,
  onRefresh,
  onSelect,
}: {
  agentName: string;
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
        <View style={styles.sidebarTitleRow}>
          <Text style={styles.sidebarTitle}>Recent chats</Text>
          <Pressable
            accessibilityLabel="Refresh recent chats"
            accessibilityRole="button"
            disabled={historyLoading}
            onPress={onRefresh}
            style={[styles.refreshButton, historyLoading && styles.disabledButton]}
          >
            {historyLoading ? (
              <ActivityIndicator color={colors.offWhite} size="small" />
            ) : (
              <MaterialIcons name="refresh" size={18} color={colors.offWhite} />
            )}
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" onPress={onClose} style={styles.sidebarIconButton}>
          <Text style={styles.sidebarIconText}>x</Text>
        </Pressable>
      </View>

      {groupedThreads.length === 0 && !historyLoading ? (
        <Text style={styles.emptyText}>No recent {agentName} chats yet.</Text>
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
              {thread.createdAt ? (
                <Text style={styles.threadTime}>{formatChatTime(thread.createdAt)}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

function normalizeAriaHistory(messages: AriaHistoryMessage[]): ChatMessage[] {
  return messages
    .filter((message) => message.content || message.attachments?.length)
    .map((message, index) => {
      const meta = message.meta ?? {};
      const escalation = message.escalation ?? null;
      const escalationQueryId = escalation?.query_id;
      const metaQueryId = meta.query_id;
      const queryId =
        typeof escalationQueryId === 'number'
          ? escalationQueryId
          : typeof metaQueryId === 'number'
            ? metaQueryId
            : null;
      const escalationStatus = escalation?.status ?? null;

      return {
        id: String(message.id ?? `${message.sender}-${message.created_at ?? index}`),
        serverId: message.id,
        role: message.sender === 'user' ? 'user' : 'aria',
        text: message.content,
        createdAt: message.created_at,
        editedAt: message.edited_at,
        attachments: message.attachments ?? [],
        pending: escalationStatus === 'pending' || meta.pending === true,
        queryId,
        escalationStatus,
        wasEscalatedPrompt: meta.pending === true,
        confidence: typeof meta.confidence === 'number' ? meta.confidence : null,
      };
    });
}

function FormattedMessageText({ text, formatBold }: { text: string; formatBold: boolean }) {
  const segments = formatBold ? getBoldSegments(text) : [{ text, bold: false }];

  return (
    <Text style={styles.bubbleText}>
      {segments.map((segment, index) => (
        <Text key={`${segment.text}-${index}`} style={segment.bold ? styles.boldText : undefined}>
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

function getBoldSegments(text: string) {
  const segments: Array<{ text: string; bold: boolean }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const start = text.indexOf('**', cursor);
    if (start === -1) {
      segments.push({ text: text.slice(cursor), bold: false });
      break;
    }

    const end = text.indexOf('**', start + 2);
    if (end === -1) {
      segments.push({ text: text.slice(cursor), bold: false });
      break;
    }

    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), bold: false });
    }

    segments.push({ text: text.slice(start + 2, end), bold: true });
    cursor = end + 2;
  }

  return segments.length ? segments : [{ text, bold: false }];
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
  return messages.filter((message) => message.id !== 'welcome');
}

function buildAriaThreads(messages: ChatMessage[]): ChatThread[] {
  const threads: ChatThread[] = [];
  let currentThread: ChatThread | undefined;

  messages.forEach((message, index) => {
    const startsThread = message.role === 'user' || !currentThread;
    if (startsThread) {
      currentThread = {
        id: `thread-${message.createdAt ?? index}`,
        title: message.role === 'user' ? getThreadTitle(message.text) : 'Agent update',
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
  chatShell: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#0F1026',
    flexDirection: 'column',
    gap: 0,
    maxHeight: 720,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#151735',
    borderBottomColor: 'rgba(255,255,255,0.10)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nameInput: {
    backgroundColor: '#202247',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    color: colors.offWhite,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  nameIconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 48,
    paddingHorizontal: 8,
  },
  nameIconText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  subtitle: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  statusText: {
    color: colors.textSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  historyToggle: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    minHeight: 34,
    width: 34,
  },
  historyToggleActive: {
    backgroundColor: 'rgba(255,107,74,0.14)',
    borderColor: 'rgba(255,107,74,0.32)',
  },
  clearChatButtonWrap: {
    alignItems: 'flex-end',
    width: '100%',
  },
  clearChatButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,74,0.14)',
    borderColor: 'rgba(255,107,74,0.32)',
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    minHeight: 34,
    width: 34,
    margin: 8,
  },
  sidebar: {
    backgroundColor: '#151735',
    borderBottomColor: 'rgba(255,255,255,0.10)',
    borderBottomWidth: 1,
    gap: 12,
    padding: 14,
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
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  sidebarIconText: {
    color: colors.textSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
  },
  sidebarTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
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
    flex: 1,
  },
  messageContent: {
    gap: 16,
    padding: 16,
  },
  messageRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  bubble: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  ariaBubble: {
    backgroundColor: '#181A3A',
    borderColor: 'rgba(255,255,255,0.11)',
    maxWidth: '92%',
  },
  userBubble: {
    backgroundColor: 'rgba(255,107,74,0.18)',
    borderColor: 'rgba(255,107,74,0.32)',
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
    fontSize: 15,
    lineHeight: 23,
  },
  boldText: {
    fontFamily: fonts.bodyMedium,
  },
  botResponse: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  messageDate: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
  escalationText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  escalationResolvedText: {
    color: colors.coral,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
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
    paddingHorizontal: 16,
  },
  composer: {
    backgroundColor: '#151735',
    borderTopColor: 'rgba(255,255,255,0.10)',
    borderTopWidth: 1,
    flexShrink: 0,
    gap: 10,
    padding: 14,
  },
  suggestionScroller: {
    maxHeight: 44,
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  suggestionChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  composerBox: {
    alignItems: 'flex-end',
    backgroundColor: colors.panelInk,
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 8,
  },
  input: {
    backgroundColor: 'transparent',
    color: colors.offWhite,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 118,
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 9,
    textAlignVertical: 'top',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 68,
    paddingHorizontal: 14,
  },
  disabledButton: {
    opacity: 0.55,
  },
  sendText: {
    color: '#1A0F0A',
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  composerHint: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.62)',
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  agentNameModal: {
    backgroundColor: '#181A38',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 420,
    padding: 18,
    width: '100%',
  },
  modalTitle: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 22,
    lineHeight: 27,
  },
  modalCaption: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  modalInput: {
    backgroundColor: '#202247',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalSecondaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 18,
  },
  modalSecondaryText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  modalPrimaryButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 88,
    paddingHorizontal: 20,
  },
  modalPrimaryText: {
    color: '#10112A',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  copyButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
  },
  copyButtonTextActive: {
    color: colors.coral,
  },
  copyButtonText: {
    color: colors.textSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  attachButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  attachmentList: {
    gap: 8,
    marginTop: 6,
  },
  attachmentChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  attachmentText: {
    color: colors.offWhite,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  selectedAttachmentList: {
    gap: 8,
    marginBottom: 10,
  },
  selectedAttachmentChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(91,141,239,0.14)',
    borderColor: 'rgba(91,141,239,0.30)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectedAttachmentText: {
    color: colors.offWhite,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  editMessageInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imageAttachmentCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  imageAttachment: {
    backgroundColor: '#202247',
    height: 190,
    width: '100%',
  },
  imageAttachmentName: {
    color: colors.textSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
