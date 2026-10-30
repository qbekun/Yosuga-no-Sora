extends RefCounted

static func allowed(name: String) -> bool:
	if name in ["QSave.sav", "system.cfg"]:
		return true
	for i in range(1, 61):
		if name == "Save%02d.png" % i:
			return true
	return false

static func valid_save(name: String, data: PackedByteArray) -> bool:
	if data.is_empty() or data.size() > 8 * 1024 * 1024:
		return false
	if name == "system.cfg":
		return ConfigFile.new().parse(data.get_string_from_utf8()) == OK
	var offset: int = 0
	if name.ends_with(".png"):
		if data.slice(0, 8).hex_encode() != "89504e470d0a1a0a":
			return false
		offset = 8
		var found: bool = false
		while offset + 12 <= data.size():
			var length: int = (int(data[offset]) << 24) | (int(data[offset + 1]) << 16) | (int(data[offset + 2]) << 8) | int(data[offset + 3])
			if length > data.size() - offset - 12:
				return false
			var kind: String = data.slice(offset + 4, offset + 8).get_string_from_ascii()
			offset += length + 12
			if kind == "IEND":
				found = true
				break
		if not found:
			return false
	if offset + 4 >= data.size():
		return false
	var unpacked: int = data.decode_u32(offset)
	if unpacked <= 0 or unpacked > 8 * 1024 * 1024:
		return false
	var raw: PackedByteArray = data.slice(offset + 4).decompress(unpacked, FileAccess.COMPRESSION_ZSTD)
	var parsed: Variant = JSON.parse_string(raw.get_string_from_utf8())
	return parsed is Dictionary and ScenarioObject.new().load(parsed)

static func handle(arguments: Array) -> void:
	var result: Dictionary = {"ok": false, "message": "Niepoprawny plik zapisu."}
	if arguments[0] == "export":
		var files: Dictionary = {}
		var slots: int = 0
		for name in DirAccess.get_files_at(FS.save_dir):
			if allowed(name):
				files[name] = Marshalls.raw_to_base64(FileAccess.get_file_as_bytes(FS.save_dir.path_join(name)))
				if name != "system.cfg":
					slots += 1
		result = {"ok": true, "bundle": {"format": "yosuga-save", "version": 1, "files": files}, "slots": slots}
	elif arguments[0] == "import":
		var bundle: Variant = JSON.parse_string(str(arguments[1]))
		if bundle is Dictionary and bundle.get("format") == "yosuga-save" and bundle.get("version") == 1 and bundle.get("files") is Dictionary:
			var decoded: Dictionary = {}
			var total: int = 0
			for name in bundle.files:
				if name is not String or not allowed(name) or bundle.files[name] is not String:
					break
				var bytes: PackedByteArray = Marshalls.base64_to_raw(bundle.files[name])
				total += bytes.size()
				if total > 32 * 1024 * 1024 or not valid_save(name, bytes):
					break
				decoded[name] = bytes
			if not decoded.is_empty() and decoded.size() == bundle.files.size():
				var success: bool = true
				for name in decoded:
					var file: FileAccess = FS.open_save_file(name)
					if file == null:
						success = false
						break
					file.store_buffer(decoded[name])
					file.close()
				if success:
					Global.load_system_data()
					Global.load_scobjs_data()
					result = {"ok": true, "message": "Zapisy wczytane. W grze wybierz Load lub Q.Load."}
	JavaScriptBridge.get_interface("window").yosugaSaveResult = JSON.stringify(result)
