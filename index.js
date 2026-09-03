import { registerRootComponent } from 'expo';
import App from './src/App';
import { installKormicApiTransport } from './src/services/apiTransport';

installKormicApiTransport();
registerRootComponent(App);
