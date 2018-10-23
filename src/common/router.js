import React, { createElement } from 'react';
import { Spin } from 'antd';
import pathToRegexp from 'path-to-regexp';
import Loadable from 'react-loadable';
import { getMenuData } from './menu';

let routerDataCache;

const modelNotExisted = (app, model) =>
    // eslint-disable-next-line
    !app._models.some(({ namespace }) => {
        return namespace === model.substring(model.lastIndexOf('/') + 1);
    });

// wrapper of dynamic
const dynamicWrapper = (app, models, component) => {
    // register models
    models.forEach(model => {
        if (modelNotExisted(app, model)) {
            // eslint-disable-next-line
            app.model(require(`../models/${model}`).default);
        }
    });

    // () => require('module')
    // transformed by babel-plugin-dynamic-import-node-sync
    if (component.toString().indexOf('.then(') < 0) {
        return props => {
            if (!routerDataCache) {
                routerDataCache = getRouterData(app);
            }
            return createElement(component().default, {
                ...props,
                routerData: routerDataCache,
            });
        };
    }
    // () => import('module')
    return Loadable({
        loader: () => {
            if (!routerDataCache) {
                routerDataCache = getRouterData(app);
            }
            return component().then(raw => {
                const Component = raw.default || raw;
                return props =>
                    createElement(Component, {
                        ...props,
                        routerData: routerDataCache,
                    });
            });
        },
        loading: () => {
            return <Spin size="large" className="global-spin" />;
        },
    });
};

function getFlatMenuData(menus) {
    let keys = {};
    menus.forEach(item => {
        if (item.children) {
            keys[item.path] = {
                ...item,
            };
            keys = {
                ...keys,
                ...getFlatMenuData(item.children),
            };
        } else {
            keys[item.path] = {
                ...item,
            };
        }
    });
    return keys;
}

export const getRouterData = app => {
    const routerConfig = {
        '/': {
            component: dynamicWrapper(app, ['user', 'login'], () =>
                import('../layouts/BasicLayout')
            ),
        },
        '/projects': {
            component: dynamicWrapper(app, ['user'], () => import('../layouts/ProjectsLayout')),
            authority: ['investor', 'admin'],
        },
        '/projects/list/:filterkey/:filtervalue': {
            component: dynamicWrapper(app, ['project'], () =>
                import('../scenes/ProjectsExplorer/ProjectsExplorer')
            ),
            authority: ['investor', 'admin'],
        },
        '/projects/detail/:id': {
            component: dynamicWrapper(app, ['projectdetail', 'owner'], () =>
                import('../scenes/ProjectDetail/ProjectDetail')
            ),
            authority: ['investor', 'admin'],
        },
        '/portfolio': {
            component: dynamicWrapper(app, ['portfolio'], () =>
                import('../scenes/Portfolio/Portfolio')
            ),
            authority: ['investor', 'admin'],
        },
        '/test': {
            component: dynamicWrapper(app, ['project'], () => import('../scenes/TestPage')),
        },
        '/user': {
            component: dynamicWrapper(app, [], () => import('../layouts/UserLayout')),
            authority: ['investor'],
        },
        '/user/login': {
            component: dynamicWrapper(app, ['login'], () =>
                import('../scenes/UserLogin/UserLogin')
            ),
        },
        '/user/register': {
            component: dynamicWrapper(app, ['register'], () =>
                import('../scenes/UserRegister/UserRegister')
            ),
        },
        '/user/register-result': {
            component: dynamicWrapper(app, [], () =>
                import('../scenes/RegisterResult/RegisterResult')
            ),
        },
        '/exchange': {
            component: dynamicWrapper(app, ['exchange'], () =>
                import('../scenes/Exchange/Exchange')
            ),
        },
        '/txhistory': {
            component: dynamicWrapper(app, [], () => import('../scenes/TxHistory/TxHistory')),
        },
        '/wallet': {
            component: dynamicWrapper(app, ['wallet'], () => import('../scenes/Wallet/Wallet')),
        },
    };
    // Get name from ./menu.js or just set it in the router data.
    const menuData = getFlatMenuData(getMenuData());

    // Route configuration data
    // eg. {name,authority ...routerConfig }
    const routerData = {};
    // The route matches the menu
    Object.keys(routerConfig).forEach(path => {
        // Regular match item name
        // eg.  router /user/:id === /user/chen
        const pathRegexp = pathToRegexp(path);
        const menuKey = Object.keys(menuData).find(key => pathRegexp.test(`${key}`));
        let menuItem = {};
        // If menuKey is not empty
        if (menuKey) {
            menuItem = menuData[menuKey];
        }
        let router = routerConfig[path];

        router = {
            ...router,
            name: router.name || menuItem.name,
            authority: router.authority || menuItem.authority,
            hideInBreadcrumb: router.hideInBreadcrumb || menuItem.hideInBreadcrumb,
        };
        routerData[path] = router;
    });
    return routerData;
};
