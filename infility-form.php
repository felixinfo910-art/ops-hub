<?php

defined( 'ABSPATH' ) || exit;

class InfilityForm {
	public function __construct() {
		add_action( 'elementor/widgets/register', function ($widgets_manager) {
			require_once( INFILITY_GLOBAL_PATH . 'widgets/infility-form/elementor-infility-form-widget.php' );
			$widgets_manager->register( new \Infility_Global_Infility_Form_Widget() );
		} );
		add_shortcode( 'infility_form', [ $this, 'shortcode_infility_form' ] );

		add_action( 'wp_ajax_InfilityGlobal_InfilityForm_get_options', [ $this, 'get_options'] );
		add_action( 'wp_ajax_InfilityGlobal_InfilityForm_set_options', [ $this, 'set_options'] );
		add_action( 'wp_ajax_InfilityGlobal_InfilityForm_clear_cache', [ $this, 'clear_cache'] );

		// add_action( 'wp_enqueue_scripts', [ $this, 'wp_enqueue_scripts' ] );
		add_action( 'wp_head', function () {
			echo '<script type="text/javascript">'
				. file_get_contents( INFILITY_GLOBAL_PATH . 'widgets/infility-form/infility-form.js' )
				. '</script>';
		} );

	}

	public function setting_page () {
		?>
		<table class="form-table J_form_table" role="presentation" style="display: none;">
			<tbody>

				<tr style="display: none;">
					<th scope="row"><label for="server">域名</label></th>
					<td>
						<input name="server" type="text" aria-describedby="tagline-description" value="" class="regular-text">
						<p class="description">表单域名，用于读取表单和提交表单。例如"https://form.infility.cn"，不需要斜杆结尾。</p>
					</td>
				</tr>

				<tr>
					<th scope="row"><label for="cache_mode">模式</label></th>
					<td>
						<select name="cache_mode" aria-describedby="cache-mode">
							<option value="direct">直连</option>
							<option value="cache">缓存</option>
						</select>
						<p class="description" id="timezone-description">
							选择缓存模式。<br />
							"直连" 表示每次打开页面时重新读取表单样式，可以及时更新，但会影响加载速度。<br />
							"缓存" 表示把表单缓存到本站点，速度快，但更新可能会有延迟。<br />
							默认是每天更新一次缓存。
						</p>
					</td>
				</tr>

				<tr>
					<td colspan="2">
						<input type="submit" class="button button-primary J_btn_save" value="保存设置">
						<input type="submit" class="button button-secondary J_btn_clear" value="清空缓存">
					</td>
				</tr>
			</tbody>
		</table>
		<script>
			;(function (w, d, $) {
				var ajaxUrl = '<?php echo admin_url('admin-ajax.php'); ?>'
				var $formTable

				var Helper = {
					init () {},

					getServer () {
						return $formTable.find('input[name="server"]').val()
					},
					setServer (value) {
						$formTable.find('input[name="server"]').val(value)
					},
					getCacheMode () {
						return $formTable.find('select[name="cache_mode"]').val()
					},
					setCacheMode (value) {
						$formTable.find('select[name="cache_mode"]').val(value)
					},

					getOptions (callback) {
						$.post(ajaxUrl, {
							action: 'InfilityGlobal_InfilityForm_get_options',
						}).done(function (ret) {
							console.log(ret)
							if (ret.success) {
								callback && callback(ret.data)
							} else {
								alert(ret.data)
							}
						}).fail(function (xhr) {
							alert('读取数据失败')
						}).always(function () {
							//
						})
					},
					saveOptions (callback) {
						$.post(ajaxUrl, {
							action: 'InfilityGlobal_InfilityForm_set_options',
							options: JSON.stringify({
								server: Helper.getServer(),
								cache_mode: Helper.getCacheMode(),
							})
						}).done(function (ret) {
							if (ret.success) {
								callback && callback(ret)
							} else {
								alert(ret.data)
							}
						}).fail(function () {
							alert('保存失败')
						})
					},
					clearCache (callback) {
						$.post(ajaxUrl, {
							action: 'InfilityGlobal_InfilityForm_clear_cache',
						}).done(function (ret) {
							if (ret.success) {
								callback && callback(ret)
							} else {
								alert(ret.data)
							}
						}).fail(function () {
							alert('清除缓存失败')
						})
					},
				}

				$(d).ready(function () {
					$formTable = $('.J_form_table')

					Helper.init()
					Helper.getOptions(function (options) {
						Helper.setServer(options.server)
						Helper.setCacheMode(options.cache_mode)
						$formTable.show()
					})

					$('.J_btn_save').click(function () {
						Helper.saveOptions(function (ret) {
							alert('保存成功')
						})
					})
					$('.J_btn_clear').click(function () {
						Helper.clearCache(function (ret) {
							alert('清除缓存成功')
						})
					})
				})
			})(window, document, window.jQuery);
		</script>
		<?php
	}

	public function get_options () {
		wp_send_json_success( self::get_option() );
		// /wp-admin/admin-ajax.php
		// wp_send_json_success
		// wp_send_json_error
	}

	public function set_options () {
		$key = 'InfilityGlobal_InfilityForm_options';
		if ( ! isset( $_POST['options'] ) ) {
			wp_send_json_error( '参数错误' );
		}
		$options = json_decode( wp_unslash( $_POST['options'] ), true );
		if ( ! $options || ! is_array( $options ) ) {
			wp_send_json_error( '参数错误' );
		}
		update_option( $key, json_encode( $options ) );
		wp_send_json_success( $options );
	}

	public function clear_cache () {
		$upload_dir = wp_upload_dir()['basedir'];
		$cache_dir = $upload_dir . '/infility_form_cache';
		if ( is_dir( $cache_dir ) ) {
			$files = glob( $cache_dir . '/*' );
			foreach ( $files as $file ) {
				if ( is_file( $file ) ) {
					if ( ! unlink( $file ) ) {
						wp_send_json_error( '清除缓存失败' );
					}
				}
			}
		}
		wp_send_json_success();
	}

	public static function get_option ( string $name = '' ) {
		$key = 'InfilityGlobal_InfilityForm_options';
		$options = get_option($key); // false if not exists
		if ($options === false) {
			$options = [
				'server' => 'https://form.infility.cn',
				'cache_mode' => 'cache',
			];
		} else {
			$options = json_decode( $options, true );
		}
		if ( $name ) {
			return $options[$name] ?? '';
		} else {
			return $options;
		}
	}

	public static function getFormHTML ( int $form_id ) : string {
		// $upload_dir = wp_upload_dir()['baseurl'];
		$upload_dir = wp_upload_dir()['basedir'];
		$cache_dir = $upload_dir . '/infility_form_cache';
		$mode = InfilityForm::get_option( 'cache_mode' );
		$server = InfilityForm::get_option( 'server' );
		if ( $mode === 'cache' && ! is_dir( $cache_dir ) ) {
			if ( ! mkdir( $cache_dir, 0755, true ) ) {
				error_log( '创建缓存目录失败' );
				$mode = 'direct';
			}
		}
		if ( $mode === 'cache' ) {
			$today = date( 'Ymd' );
			$cache_file = $cache_dir . '/' . $today . '-' . $form_id . '.html';
			if ( file_exists( $cache_file ) ) {
				return file_get_contents( $cache_file );
			}
		}
		$url = "{$server}/form/{$form_id}"; // preview 是为了避免输出 html 和 body 标签。
		$response = wp_remote_get( $url );
		if ( is_wp_error( $response ) ) {
			error_log( sprintf( '获取表单失败1: %s %s', $form_id, $url, $response->get_error_message() ) );
			sleep( 1 );
			$response = wp_remote_get( "{$server}/form/{$form_id}" );
			if ( is_wp_error( $response ) ) {
				error_log( sprintf( '获取表单失败2: %s %s', $form_id, $url, $response->get_error_message() ) );
				sleep( 1 );
				$response = wp_remote_get( "{$server}/form/{$form_id}" );
				if ( is_wp_error( $response ) ) {
					error_log( sprintf( '获取表单失败3: %s %s', $form_id, $url, $response->get_error_message() ) );
					return 'An error occurred. Please try again later.';
				}
			}
		}
		$html = wp_remote_retrieve_body( $response );
		if ( $mode === 'cache' ) {
			file_put_contents( $cache_file, $html );
		}
		return $html;
	}

	public function wp_enqueue_scripts () {
		// 暂时没使用
		wp_enqueue_script(
			/* id */ 'infilityglobal-infilityform-js',
			/* src */ INFILITY_GLOBAL_PATH . 'widgets/infility-form/infility-form.js',
			/* dependencies */ array(),
			/* version */ INFILITY_GLOBAL_VERSION,
			/* in_footer */ false
		);
	}

	public function shortcode_infility_form ( $atts ) {
		$atts = shortcode_atts( array(
			'id' => 0,
		), $atts, 'infility_form' );

		if ( ! $atts['id'] ) {
			return '';
		}

		return InfilityForm::getFormHTML( intval( $atts['id'] ) );
	}
}

new InfilityForm();
