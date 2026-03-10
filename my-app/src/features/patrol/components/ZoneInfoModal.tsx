import { Modal, Text, View } from 'react-native';

export function ZoneInfoModal({ visible, zoneName }: { visible: boolean; zoneName?: string }) {
  return <Modal visible={visible} transparent><View style={{ marginTop: 80, backgroundColor: 'white', padding: 16 }}><Text>{zoneName ?? 'Unknown zone'}</Text></View></Modal>;
}
