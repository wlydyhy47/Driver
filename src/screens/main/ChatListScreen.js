import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/common/Header';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import ConversationItem from '../../components/chat/ConversationItem';
import { getConversations } from '../../api/chat';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { globalStyles } from '../../styles/globalStyles';

export default function ChatListScreen() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const loadConversations = async () => {
    const result = await getConversations();
    if (result.success) {
      setConversations(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleConversationPress = (conversation) => {
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      title: conversation.title,
    });
  };

  const renderEmptyState = () => (
    <View style={globalStyles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={colors.textDisabled} />
      <Text style={globalStyles.emptyText}>لا توجد محادثات</Text>
      <Text style={styles.emptySubtext}>
        ستظهر هنا محادثاتك مع العملاء والمتاجر
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={globalStyles.safeArea}>
        <Header title="المحادثات" showNotification />
        <LoadingOverlay visible={true} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <Header title="المحادثات" showNotification />
      
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            onPress={() => handleConversationPress(item)}
          />
        )}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={conversations.length === 0 && styles.emptyList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyList: {
    flexGrow: 1,
  },
  emptySubtext: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});