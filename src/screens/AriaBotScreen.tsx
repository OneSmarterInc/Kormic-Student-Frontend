import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthSession } from '../models/onboarding';
import { chatWithAria } from '../services/api';
import { colors, fonts } from '../theme/tokens';

type ChatMessage = {
  id: string;
  role: 'user' | 'aria';
  text: string;
};

const STARTER_PROMPT = 'Hows my profile? What should i need to add more?';

export function AriaBotScreen({ session }: { session?: AuthSession }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'aria',
      text: 'Hi, I am Aria. Ask me about your profile, resumes, GitHub, LinkedIn, or what to improve next.',
    },
  ]);
  const [draft, setDraft] = useState(STARTER_PROMPT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setMessages((current) => [...current, userMessage]);
      setDraft('');

      const response = await chatWithAria(session, message);
      setMessages((current) => [
        ...current,
        {
          id: `aria-${Date.now()}`,
          role: 'aria',
          text: response.reply || response.message || 'Aria did not return a reply.',
        },
      ]);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : 'Unable to chat with Aria');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <View style={styles.header}>
        <Text style={styles.title}>Aria</Text>
        <Text style={styles.subtitle}>Profile guidance assistant</Text>
      </View>
     <View style={styles.container}>
      

      <ScrollView style={styles.messages} contentContainerStyle={styles.messageContent}>
        {messages.map((message) => (
          <View
            key={message.id}
            style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.ariaBubble]}
          >
            <Text style={styles.bubbleLabel}>{message.role === 'user' ? 'You' : 'Aria'}</Text>
            <Text style={styles.bubbleText}>{message.text}</Text>
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

     
    </View>
     <View style={styles.composer}>
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
    </>
   
  );
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
    backgroundColor: 'rgba(91,141,239,0.10)',
    borderColor: 'rgba(91,141,239,0.18)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
    marginBottom:12,
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
