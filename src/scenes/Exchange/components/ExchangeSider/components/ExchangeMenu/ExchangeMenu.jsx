import React, { PureComponent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Layout, Menu, Icon } from 'antd';
import { Link } from 'dva/router';
import PropTypes from 'prop-types';
import pathToRegexp from 'path-to-regexp';
import { injectIntl } from 'react-intl';
import classNames from 'classnames';
import { urlToList } from '../../../../../../components/_utils/pathTools';
import { getMessage } from '../../../../../../common/definedmessages';
import styles from './ExchangeMenu.less';

const { Sider } = Layout;
const { SubMenu } = Menu;

// Allow menu.js config icon as string or ReactNode
//   icon: 'setting',
//   icon: 'http://demo.com/icon.png',
//   icon: <Icon type="setting" />,
const getIcon = icon => {
    if (typeof icon === 'string') {
        if (icon.indexOf('http') === 0) {
            return <img src={icon} alt="icon" className={`${styles.icon} sider-menu-item-img`} />;
        }
        if (icon.indexOf('fa-') === 0) {
            const faName = icon.slice(3, icon.length);
            return (
                <i className="anticon">
                    <FontAwesomeIcon icon={faName} />
                </i>
            );
        }
        return <Icon type={icon} />;
    }

    return icon;
};

/**
 * Recursively flatten the data
 * [{path:string},{path:string}] => [path,path2]
 * @param  menu
 */
export const getFlatMenuKeys = menu =>
    menu.reduce((keys, item) => {
        keys.push(item.path);
        if (item.children) {
            return keys.concat(getFlatMenuKeys(item.children));
        }
        return keys;
    }, []);

/**
 * Find all matched menu keys based on paths
 * @param  flatMenuKeys: [/abc, /abc/:id, /abc/:id/info]
 * @param  paths: [/abc, /abc/11, /abc/11/info]
 */
export const getMenuMatchKeys = (flatMenuKeys, paths) =>
    paths.reduce(
        (matchKeys, path) =>
            matchKeys.concat(flatMenuKeys.filter(item => pathToRegexp(item).test(path))),
        []
    );

class ExchangeMenu extends PureComponent {
    constructor(props) {
        super(props);
        this.flatMenuKeys = getFlatMenuKeys(props.menuData);
        this.state = {
            openKeys: this.getDefaultCollapsedSubMenus(props),
        };
    }

    componentWillReceiveProps(nextProps) {
        const { location } = this.props;
        if (nextProps.location.pathname !== location.pathname) {
            this.setState({
                openKeys: this.getDefaultCollapsedSubMenus(nextProps),
            });
        }
    }

    /**
     * Convert pathname to openKeys
     * /list/search/articles = > ['list','/list/search']
     * @param  props
     */
    getDefaultCollapsedSubMenus(props) {
        const {
            location: { pathname },
        } =
            props || this.props;
        return getMenuMatchKeys(this.flatMenuKeys, urlToList(pathname));
    }

    /**
     * Check whether it is http link.return a or Link
     * @memberof SiderMenu
     */
    getMenuItemPath = item => {
        const { intl } = this.props;
        const itemPath = this.conversionPath(item.path);
        const icon = getIcon(item.icon);
        const { target, name } = item;
        const itemName = intl.formatMessage(getMessage(name));
        // Is it a http link
        if (/^https?:\/\//.test(itemPath)) {
            return (
                <a href={itemPath} target={target}>
                    {icon}
                    <span>{itemName}</span>
                </a>
            );
        }
        const { location, isMobile, onCollapse } = this.props;
        return (
            <Link
                to={itemPath}
                target={target}
                replace={itemPath === location.pathname}
                onClick={isMobile ? () => onCollapse(true) : undefined}
            >
                {icon}
                <span>{itemName}</span>
            </Link>
        );
    };

    /**
     * get SubMenu or Item
     */
    getSubMenuOrItem = item => {
        const { intl } = this.props;
        if (item.children && item.children.some(child => child.name)) {
            const childrenItems = this.getNavMenuItems(item.children);

            if (childrenItems && childrenItems.length > 0) {
                return (
                    <SubMenu
                        title={
                            item.icon ? (
                                <span>
                                    {getIcon(item.icon)}
                                    <span>{intl.formatMessage(getMessage(item.name))}</span>
                                </span>
                            ) : (
                                intl.formatMessage(getMessage(item.name))
                            )
                        }
                        key={item.path}
                    >
                        {childrenItems}
                    </SubMenu>
                );
            }
            return null;
        } else {
            return <Menu.Item key={item.path}>{this.getMenuItemPath(item)}</Menu.Item>;
        }
    };

    /**
     * 获得菜单子节点
     * @memberof SiderMenu
     */
    getNavMenuItems = menusData => {
        if (!menusData) {
            return [];
        }
        return menusData
            .filter(item => item.name && !item.hideInMenu)
            .map(item => {
                // make dom
                const ItemDom = this.getSubMenuOrItem(item);
                return this.checkPermissionItem(item.authority, ItemDom);
            })
            .filter(item => item);
    };

    // Get the currently selected menu
    getSelectedMenuKeys = () => {
        const {
            location: { pathname },
        } = this.props;
        return getMenuMatchKeys(this.flatMenuKeys, urlToList(pathname));
    };

    // conversion Path
    // 转化路径
    conversionPath = path => {
        if (path && path.indexOf('http') === 0) {
            return path;
        } else {
            return `/${path || ''}`.replace(/\/+/g, '/');
        }
    };

    // permission to check
    checkPermissionItem = (authority, ItemDom) => {
        const { Authorized } = this.props;
        if (Authorized && Authorized.check) {
            const { check } = Authorized;
            return check(authority, ItemDom);
        }
        return ItemDom;
    };

    handleOpenChange = openKeys => {
        this.setState({
            openKeys: [...openKeys],
        });
    };

    render() {
        const { menuData, collapsed, onCollapse } = this.props;
        const { openKeys } = this.state;
        // Don't show popup menu when it is been collapsed
        const menuProps = collapsed ? {} : { openKeys };
        // if pathname can't match, use the nearest parent's key
        let selectedKeys = this.getSelectedMenuKeys();
        if (!selectedKeys.length) {
            selectedKeys = [openKeys[openKeys.length - 1]];
        }
        return (
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                breakpoint="lg"
                onCollapse={onCollapse}
                width={220}
                theme="light"
                className={classNames('exchange-side-menu', styles.sider)}
            >
                <Menu
                    key="Menu"
                    theme="light"
                    mode="inline"
                    {...menuProps}
                    onOpenChange={this.handleOpenChange}
                    selectedKeys={selectedKeys}
                    style={{ width: '100%', borderRight: 'none' }}
                    inlineIndent={12}
                >
                    {this.getNavMenuItems(menuData)}
                </Menu>
            </Sider>
        );
    }
}

const propTypes = {
    intl: PropTypes.object.isRequired,
};
ExchangeMenu.propTypes = propTypes;

export default injectIntl(ExchangeMenu, { withRef: true });
