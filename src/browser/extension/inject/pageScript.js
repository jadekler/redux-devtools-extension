import { getActionsArray, evalAction } from 'remotedev-utils';
import createStore from '../../../app/stores/createStore';
import configureStore  from '../../../app/stores/enhancerStore';
import Monitor from '../../../app/service/Monitor';
import {
  updateStore, toContentScript, sendMessage, setListener, connect, disconnect,
  generateId, isInIframe
} from '../../../app/api';

let stores = {};

const devToolsExtension = function(reducer) {
  const instanceId = generateId(reducer.instanceId);
  const monitor = new Monitor();

  return (next) => {
    return (reducer_, initialState_, enhancer_) => {
      return stores[instanceId] =
        configureStore(next, monitor.reducer, reducer)(reducer_, initialState_, enhancer_);
    }
  }
};

window.__REDUX_DEVTOOLS_EXTENSION__ = window.devToolsExtension;

const preEnhancer = instanceId => next =>
  (reducer, preloadedState, enhancer) => {
    const store = next(reducer, preloadedState, enhancer);

    // Mutate the store in order to keep the reference
    if (stores[instanceId]) {
      stores[instanceId].dispatch = store.dispatch;
      stores[instanceId].liftedStore = store.liftedStore;
      stores[instanceId].getState = store.getState;
    }

    return {
      ...store,
      dispatch: (action) => (
        window.__REDUX_DEVTOOLS_EXTENSION_LOCKED__ ? action : store.dispatch(action)
      )
    };
  };

const extensionCompose = (config) => (...funcs) => {
  return (...args) => {
    const instanceId = generateId(config.instanceId);
    return [preEnhancer(instanceId), ...funcs].reduceRight(
      (composed, f) => f(composed), devToolsExtension({ ...config, instanceId })(...args)
    );
  };
};

window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = (...funcs) => {
  if (funcs.length === 0) {
    return devToolsExtension();
  }
  if (funcs.length === 1 && typeof funcs[0] === 'object') {
    return extensionCompose(funcs[0]);
  }
  return extensionCompose({})(...funcs);
};
