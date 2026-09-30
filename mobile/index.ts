// 앱 진입점. expo-router 기본 진입점에 Android 위젯 처리기 등록을 더한다.
// (react-native-android-widget 문서의 "Expo + Expo Router" 방식)
import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/widget/widget-task-handler';

registerWidgetTaskHandler(widgetTaskHandler);
