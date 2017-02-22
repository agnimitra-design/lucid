import _ from 'lodash';
import React from 'react';
import { lucidClassNames } from '../../util/style-helpers';
import { buildHybridComponent } from '../../util/state-management';
import {
	partitionText,
	propsSearch,
} from '../../util/text-manipulation';
import {
	createClass,
	omitProps,
	getFirst,
	findTypes,
	// filterTypes,
	// rejectTypes,
} from '../../util/component-types';
import { SearchFieldDumb as SearchField } from '../SearchField/SearchField';
import { DropMenuDumb as DropMenu } from '../DropMenu/DropMenu';
import Checkbox from '../Checkbox/Checkbox';
import Selection from '../Selection/Selection';

import * as reducers from './SearchableMultiSelect.reducers';

const {
	any,
	arrayOf,
	bool,
	func,
	number,
	object,
	oneOfType,
	shape,
	string,
	oneOf,
} = React.PropTypes;

const cx = lucidClassNames.bind('&-SearchableMultiSelect');

/**
 *
 * {"categories": ["controls", "selectors"]}
 *
 * A control used to select a multiple option from a dropdown list using a
 * SearchField.
 */
const SearchableMultiSelect = createClass({
	displayName: 'SearchableMultiSelect',

	reducers,

	components: {
		/**
		 * A selectable option in the list.
		 */
		Option: createClass({
			displayName: 'SearchableMultiSelect.Option',
			propName: 'Option',
			propTypes: DropMenu.Option.propTypes,
		}),
	},

	propTypes: {
		/**
		 * Styles that are passed through to root element.
		 */
		style: object,
		/**
		 * Appended to the component-specific class names set on the root element.
		 */
		className: string,
		/**
		 * Disables the control from being clicked or focused.
		 */
		isDisabled: bool,
		/**
		 * Displays a LoadingIcon to allow for asynchronous loading of options.
		 */
		isLoading: bool,
		/**
		 * The max height of the fly-out menu.
		 */
		maxMenuHeight: oneOfType([number, string]),
		/**
		 * Called when the user enters a value to search for; the set of visible
		 * Options will be filtered using the value.
		 *
		 * Signature: `(searchText, firstVisibleIndex, {props, event}) => {}`
		 *
		 * `searchText` is the value from the `SearchField` and `firstVisibleIndex`
		 * is the index of the first option that will be visible after filtering.
		 */
		onSearch: func,
		/**
		 * Called when an option is selected.
		 *
		 * Signature: `(optionIndex, {props, event}) => {}`
		 *
		 * `optionIndex` is the new `selectedIndex` or `null`.
		 */
		onSelect: func,
		/**
		 * Called when the user clicks to remove all selections.
		 *
		 * Signature: `({props, event}) => {}`
		 */
		onRemoveAll: func,
		/**
		 * The function that will be run against each Option's props to determine
		 * whether it should be visible or not. The default behavior of the
		 * function is to match, ignoring case, against any text node descendant of
		 * the `Option`.
		 *
		 * Signature: `(searchText, optionProps) => {}`
		 *
		 * If `true` is returned, the option will be visible. If `false`, the
		 * option will not be visible.
		 */
		optionFilter: func,
		/**
		 * The current search text to filter the list of options by.
		 */
		searchText: string,
		/**
		 * An array of currently selected `SearchableMultiSelect.Option` indices or
		 * `null` if nothing is selected.
		 */
		selectedIndices: arrayOf(number),
		/**
		 * Object of DropMenu props which are passed through to the underlying
		 * DropMenu component.
		 */
		DropMenu: shape(DropMenu.propTypes),
		/**
		 * Object of SearchField props which are passed through to the underlying
		 * SearchField component.
		 */
		SearchField: shape(SearchField.propTypes),
		/**
		 * *Child Element* - These are menu options. The `optionIndex` is in-order
		 * of rendering regardless of group nesting, starting with index `0`. Each
		 * `Option` may be passed a prop called `isDisabled` to disable selection
		 * of that `Option`. Any other props pass to Option will be available from
		 * the `onSelect` handler.
		 */
		Option: any,
		/**
		 * Adjusts the display of this component. This should typically be driven
		 * by screen size. Currently `small` and `large` are explicitly handled
		 * by this component.
		 */
		responsiveMode: oneOf(['small', 'medium', 'large']),
	},

	getDefaultProps() {
		return {
			hasReset: true,
			isSelectionHighlighted: true,
			isDisabled: false,
			isLoading: false,
			onRemoveAll: _.noop,
			optionFilter: propsSearch,
			searchText: '',
			selectedIndices: [],
			DropMenu: DropMenu.getDefaultProps(),
			SearchField: SearchField.getDefaultProps(),
			responsiveMode: 'large',
		};
	},

	handleDropMenuSelect(optionIndex, { event }) {
		const { onSelect } = this.props;

		return onSelect(optionIndex);
	},

	handleCheckboxSelect(_isSelected, {
		// TODO: make sure the consumer can do callbackId somehow
		event,
		props: { callbackId: optionIndex },
	}) {
		// TODO: are these needed?
		// event.stopPropagation();
		// event.preventDefault();

		return this.props.onSelect(optionIndex);
	},

	handleSelectionRemove({ props: { callbackId: optionIndex } }) {
		return this.props.onSelect(optionIndex);
	},

	handleRemoveAll({ event }) {
		this.props.onRemoveAll({ event, props: this.props });
	},

	handleSearch(searchText) {
		const {
			props,
			props: {
				onSearch,
				optionFilter,
				DropMenu: {
					onExpand,
				},
			},
		} = this;

		const options = _.map(findTypes(props, SearchableMultiSelect.Option), 'props');
		const firstVisibleIndex = _.findIndex(options, (option) => {
			return optionFilter(searchText, option);
		});

		onExpand();
		return onSearch(searchText, firstVisibleIndex);
	},

	renderUnderlinedChildren(childText, searchText) {
		const [pre, match, post] = partitionText(childText, new RegExp(_.escapeRegExp(searchText), 'i'), searchText.length);

		return [
			pre && <span key='pre' className={cx('&-Option-underline-pre')}>{pre}</span>,
			match && <span key='match' className={cx('&-Option-underline-match')}>{match}</span>,
			post && <span key='post' className={cx('&-Option-underline-post')}>{post}</span>,
		];
	},

	renderOptions(optionsProps) {
		const {
			optionFilter,
			searchText,
			selectedIndices,
		} = this.props;

		const options = _.map(optionsProps, (optionProps, optionIndex) => (
			<DropMenu.Option
				{..._.omit(optionProps, 'children')}
				isHidden={!optionFilter(searchText, optionProps)}
				key={optionIndex}
			>
				<div className={cx('&-checkbox')}>
					<Checkbox
						onSelect={this.handleCheckboxSelect}
						callbackId={optionIndex}
						isSelected={_.includes(selectedIndices, optionIndex)}
					/>
					<div className={cx('&-checkbox-label')}>
						{_.isString(optionProps.children) ?
							this.renderUnderlinedChildren(optionProps.children, searchText)
						: optionProps.children}
					</div>
				</div>
			</DropMenu.Option>
		));

		const visibleOptionsCount = _.filter(options, (option) => !option.props.isHidden).length;

		return visibleOptionsCount > 0
			? options
			: <DropMenu.Option isDisabled><span className={cx('&-noresults')}>No results match "{searchText}"</span></DropMenu.Option>;
	},

	render() {
		const {
			props,
			props: {
				className,
				isLoading,
				isDisabled,
				maxMenuHeight,
				style,
				selectedIndices,
				DropMenu: dropMenuProps,
				responsiveMode,
				searchText,
				...passThroughs
			},
		} = this;

		const {
			onExpand,
			onCollapse,
			optionContainerStyle,
		} = dropMenuProps;

		const searchFieldProps = _.get(getFirst(props, SearchField), 'props', {});
		const optionsProps = _.map(findTypes(props, SearchableMultiSelect.Option), 'props');
		const isSmall = responsiveMode === 'small';

		return (
			<div
				{...omitProps(passThroughs, SearchableMultiSelect)}
				className={cx('&', className)}
			>
				<DropMenu
					{...dropMenuProps}
					selectedIndices={null}
					className={cx('&-DropMenu', dropMenuProps.className)}
					optionContainerStyle={_.assign({}, optionContainerStyle, !_.isNil(maxMenuHeight) ? { maxHeight: maxMenuHeight } : null)}
					isDisabled={isDisabled}
					isLoading={isLoading}
					onSelect={this.handleDropMenuSelect}
					style={style}
				>
					<DropMenu.Control>
						<SearchField
							{...searchFieldProps}
							className={cx('&-search', {
								'&-search-is-small': isSmall,
							}, searchFieldProps.className)}
							value={searchText}
							onChange={this.handleSearch}
						/>
					</DropMenu.Control>
					{this.renderOptions(optionsProps)}
				</DropMenu>

				{!_.isEmpty(selectedIndices) ?
					<Selection
						isBold
						hasBackground
						Label='Selected'
						kind='container'
						onRemove={this.handleRemoveAll}
						responsiveMode={responsiveMode}
					>
						{_.map(selectedIndices, (selectedIndex) => (
							<Selection
								key={selectedIndex}
								callbackId={selectedIndex}
								responsiveMode={responsiveMode}
								onRemove={this.handleSelectionRemove}
							>
								<Selection.Label>
									{optionsProps[selectedIndex].children}
								</Selection.Label>
							</Selection>
						))}
					</Selection>
				: null}
			</div>
		);
	},
});

export default buildHybridComponent(SearchableMultiSelect);
export { SearchableMultiSelect as SearchableSelectDumb };
