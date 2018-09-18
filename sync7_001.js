
var sync7 = (typeof(module) != 'undefined') ? module.exports : {}
;(function () {

    
    function each(o, cb) {
        if (o instanceof Array) {
            for (var i = 0; i < o.length; i++) {
                if (cb(o[i], i, o) == false)
                    return false
            }
        } else {
            for (var k in o) {
                if (o.hasOwnProperty(k)) {
                    if (cb(o[k], k, o) == false)
                        return false
                }
            }
        }
        return true
    }

    function map(o, func) {
        if (o instanceof Array) {
            var accum = []
            for (var i = 0; i < o.length; i++)
                accum[i] = func(o[i], i, o)
            return accum
        } else {
            var accum = {}
            for (var k in o)
                if (o.hasOwnProperty(k))
                    accum[k] = func(o[k], k, o)
            return accum
        }
    }
    

})();




<script src="https://dglittle.github.io/cdn/utils004.js"></script>
<script src="https://invisible-college.github.io/universal-sync/diffsync.js"></script>
<script>

Math.randomSeed(7)

function my_custom_merge_func(s7, a, b, a_text, b_text, a_regions, b_regions) {
    // regions be like [pos, len, untouched?, index in other region array of this untouched or -1 if not present, index of first region in other array that this region is definitely before, index of last region in other array that this region is definitely after]
    
    // console.log('HI!!')
    // console.log(a)
    // console.log(b)
    // console.log(a_text)
    // console.log(b_text)
    // console.log(a_regions)
    // console.log(b_regions)

    var text = []
    var a_diff = []
    var b_diff = []
    var on_a = true
    var ai = 0
    var bi = 0
    while (true) {
        var aa = a_regions[ai]
        var bb = b_regions[bi]
        if (!aa && !bb) break
        if (!aa) on_a = false
        if (!bb) on_a = true
        
        var ci = on_a ? ai : bi
        var di = on_a ? bi : ai
        var cc = on_a ? aa : bb
        var dd = on_a ? bb : aa
        var c_text = on_a ? a_text : b_text
        var d_text = on_a ? b_text : a_text
        var c_diff = on_a ? a_diff : b_diff
        var d_diff = on_a ? b_diff : a_diff

        if (cc[5] < di) {
            var t = c_text.substr(cc[0], cc[1])
            if (cc[2]) {
                if (cc[3] < di) {
                    c_diff.push(['', t])
                } else if (cc[3] == di) {
                    text.push(t)
                    sync7_push_eq(c_diff, cc[1])
                    sync7_push_eq(d_diff, cc[1])
                    if (on_a) { bi++ } else { ai++ }
                } else {
                    text.push(t)
                    sync7_push_eq(c_diff, cc[1])
                    d_diff.push([t, ''])
                }
            } else {
                text.push(t)
                sync7_push_eq(c_diff, cc[1])
                d_diff.push([t, ''])
            }
            if (on_a) { ai++ } else { bi++ }
        } else if (dd && dd[5] < ci) {
            on_a = !on_a
        } else {
            throw 'failure'
        }
    }

    // console.log('HI!!!!!!')
    // console.log(text)
    // console.log(a_diff)
    // console.log(b_diff)

    return {
        text : text.join(''),
        to_a : a_diff,
        to_b : b_diff
    }
}

function create_sync7_repo() {
    return {
        commits : {
            'root' : { to_parents : {}, from_kids : {} }
        },
        temp_commits : {},
        leaf : 'root',
        text : ''
    }
}

function sync7_commit(s7, s) {
    if (s == s7.text) { return }
    
    var cs = s7.temp_commits
    s7.temp_commits = {}

    var id = guid()
    var to_parents = {}
    s7.commits[s7.leaf].from_kids[id] = to_parents[s7.leaf] = sync7_diff(s, s7.text)
    s7.commits[id] = cs[id] = { to_parents : to_parents, from_kids : {} }
    s7.leaf = id
    
    s7.text = s
    return cs
}

function sync7_merge(s7, cs, custom_merge_func, cursor) {
    var cursor_projection_node = s7.leaf
    var cursor_projection_offset = cursor
    while (s7.temp_commits[cursor_projection_node]) {
        var old_node = cursor_projection_node
        each(s7.commits[cursor_projection_node].to_parents, function (d, p) {
            var offset = 0
            var poffset = 0
            each(d, function (d) {
                if (typeof(d) == 'number') {
                    if (cursor_projection_offset <= offset + d) {
                        cursor_projection_offset = cursor_projection_offset - offset + poffset
                        cursor_projection_node = p
                        return false
                    }
                    offset += d
                    poffset += d
                } else {
                    offset += d[0].length
                    poffset += d[1].length
                }
            })
            if (old_node != cursor_projection_node)
                return false
        })
        if (old_node == cursor_projection_node)
            throw 'failed to project cursor up'
    }

    each(cs, function (c, id) {
        s7.commits[id] = c
        each(c.to_parents, function (d, p) {
            if (!cs[p] && s7.commits[p]) {
                s7.commits[p].from_kids[id] = d
            }
        })
    })
    var leaves = sync7_get_leaves(s7.commits, s7.temp_commits)
    leaves = Object.keys(leaves).sort()
    
    var texts = {}
    each(leaves, function (leaf) {
        texts[leaf] = sync7_get_text(s7, leaf)
    })

    each(s7.temp_commits, function (c, k) {
        each(c.to_parents, function (d, p) {
            if (!s7.temp_commits[p]) {
                delete s7.commits[p].from_kids[k]
            }
        })
        delete s7.commits[k]
    })
    s7.temp_commits = {}
    
    var prev_merge_node = leaves[0]
    var ancestors = sync7_get_ancestors(s7, prev_merge_node)
    for (var i = 1; i < leaves.length; i++) {
        var leaf = leaves[i]
        var i_ancestors = sync7_get_ancestors(s7, leaf)
        var CAs = sync7_intersection(ancestors, i_ancestors)
        var LCAs = sync7_get_leaves(CAs)
        each(i_ancestors, function (v, k) {
            ancestors[k] = v
        })
        
        function get_nodes_on_path_to_LCAs(node) {
            var agg = {}
            function helper(x) {
                var hit_LCA = LCAs[x]
                if (!CAs[x]) {
                    each(s7.commits[x].to_parents, function (d, p) {
                        hit_LCA = helper(p) || hit_LCA
                    })
                }
                if (hit_LCA) {
                    agg[x] = true
                    return true
                }
            }
            helper(node)
            return agg
        }

        function calc_dividers_and_such_for_node(node, nodes_on_path_to_LCAs, dividers, untouched_regions_for_node) {
            untouched_regions_for_node[node] = [[0, texts[node].length, 0]]
            function helper(node) {
                if (untouched_regions_for_node[node]) return untouched_regions_for_node[node]
                var pur = {}
                each(s7.commits[node].from_kids, function (d, k) {
                    if (!nodes_on_path_to_LCAs[k]) { return }
                    var untouched = helper(k)
                    
                    var ui = 0
                    var uo = 0
                    var offset = 0
                    var poffset = 0
                    each(d, function (r) {
                        var end_point = offset + ((typeof(r) == 'number') ? r : r[0].length)
                        while (untouched[ui] && end_point >= untouched[ui][2] + untouched[ui][1]) {
                            if (typeof(r) == 'number') {
                                var x = untouched[ui][2] + uo - offset + poffset
                                pur[x] = [untouched[ui][0] + uo, untouched[ui][1] - uo, x]
                            }
                            ui++
                            uo = 0
                        }
                        if (!untouched[ui]) { return false }
                        if (end_point > untouched[ui][2] + uo) {
                            if (typeof(r) == 'number') {
                                var x = untouched[ui][2] + uo - offset + poffset
                                pur[x] = [untouched[ui][0] + uo, end_point - (untouched[ui][2] + uo), x]
                            }
                            uo = end_point - untouched[ui][2]
                            dividers[untouched[ui][0] + uo] = untouched[ui][0] + uo
                        }
                        offset = end_point
                        poffset += (typeof(r) == 'number') ? r : r[1].length
                    })
                })
                return untouched_regions_for_node[node] = Object.values(pur).sort(function (a, b) { return a[2] - b[2] })
            }
            each(LCAs, function (_, lca) { helper(lca) })
        }

        var prev_nodes_on_path_to_LCAs = get_nodes_on_path_to_LCAs(prev_merge_node)
        var prev_dividers = {}
        var prev_untouched_regions_for_node = {}
        calc_dividers_and_such_for_node(prev_merge_node, prev_nodes_on_path_to_LCAs, prev_dividers, prev_untouched_regions_for_node)

        var leaf_nodes_on_path_to_LCAs = get_nodes_on_path_to_LCAs(leaf)
        var leaf_dividers = {}
        var leaf_untouched_regions_for_node = {}
        calc_dividers_and_such_for_node(leaf, leaf_nodes_on_path_to_LCAs, leaf_dividers, leaf_untouched_regions_for_node)
        
        each(LCAs, function (_, lca) {
            function do_one_against_the_other(a, b, dividers) {
                var bb, bi = 0
                each(a, function (aa) {
                    while ((bb = b[bi]) && (bb[2] + bb[1] <= aa[2])) bi++
                    if (bb && bb[2] < aa[2]) {
                        var x = aa[2] - bb[2] + bb[0]
                        dividers[x] = x
                    }
                    while ((bb = b[bi]) && (bb[2] + bb[1] <= aa[2] + aa[1])) bi++
                    if (bb && bb[2] < aa[2] + aa[1]) {
                        var x = aa[2] + aa[1] - bb[2] + bb[0]
                        dividers[x] = x
                    }
                })
            }
            
            var a = prev_untouched_regions_for_node[lca]
            var b = leaf_untouched_regions_for_node[lca]
            do_one_against_the_other(a, b, leaf_dividers)
            do_one_against_the_other(b, a, prev_dividers)
        })
        
        function calc_endpoints(dividers, node) {
            var endpoints = []
            endpoints.push([0, 0, 0])
            each(Object.values(dividers).sort(function (a, b) { return a - b }), function (offset) {
                endpoints.push([offset, 1, offset])
                endpoints.push([offset, 0, offset])
            })
            endpoints.push([texts[node].length, 1, texts[node].length])
            
            return endpoints
        }
        
        var prev_endpoints = calc_endpoints(prev_dividers, prev_merge_node)
        var leaf_endpoints = calc_endpoints(leaf_dividers, leaf)

        function project_endpoints_to_LCAs(endpoints, node, nodes_on_path_to_LCAs) {
            var endpoints_for_node = {}
            endpoints_for_node[node] = endpoints

            function helper(node) {
                if (endpoints_for_node[node]) return endpoints_for_node[node]
                var agg = {}
                function add_to_agg(endpoint, projected_pos) {
                    var key = '[' + endpoint[0] + ',' + endpoint[1] + ']'
                    if (endpoint[1] == 0)
                        agg[key] = Math.min(agg[key] || Infinity, projected_pos)
                    else
                        agg[key] = Math.max(agg[key] || -Infinity, projected_pos)
                }
                each(s7.commits[node].from_kids, function (d, k) {
                    if (!nodes_on_path_to_LCAs[k]) { return }
                    
                    var endpoints = helper(k)
                    var ei = 0
                    
                    var offset = 0
                    var poffset = 0
                    each(d, function (d) {
                        var end = offset + ((typeof(d) == 'number') ? d : d[0].length)
                        while (endpoints[ei] && (endpoints[ei][2] < end || (endpoints[ei][1] == 1 && endpoints[ei][2] <= end))) {
                            if (typeof(d) == 'number') {
                                add_to_agg(endpoints[ei], endpoints[ei][2] - offset + poffset)
                            } else if (endpoints[ei][1] == 0) {
                                add_to_agg(endpoints[ei], poffset)
                            } else {
                                add_to_agg(endpoints[ei], poffset + d[1].length)
                            }
                            ei++
                        }
                        offset = end
                        poffset += (typeof(d) == 'number') ? d : d[1].length
                    })
                    while (endpoints[ei]) {
                        add_to_agg(endpoints[ei], poffset)
                        ei++
                    }
                })
                
                var endpoints = []
                each(agg, function (v, k) {
                    var kk = eval(k)
                    endpoints.push([kk[0], kk[1], v])
                })
                
                return endpoints_for_node[node] = endpoints.sort(function (a, b) {
                    if (a[2] != b[2])
                        return a[2] - b[2]
                    return b[1] - a[1]
                })
            }

            var regions_for_node = {}

            var lookup_by_begin = {}
            var lookup_by_end = {}
            var base_regions = []
            regions_for_node[node] = base_regions
            for (var i = 0; i < endpoints.length; i += 2) {
                var e0 = endpoints[i][0]
                var e1 = endpoints[i + 1][0]
                base_regions.push([e0, e1 - e0])
                lookup_by_begin[e0] = base_regions.length - 1
                lookup_by_end[e1] = base_regions.length - 1
            }
            
            each(LCAs, function (_, lca) {
                var endpoints = helper(lca)
                var regions = []
                regions_for_node[lca] = regions
                each(endpoints, function (e) {
                    if (e[1] == 0) {
                        var i = lookup_by_begin[e[0]];
                        (regions[i] = regions[i] || [])[0] = e[2]
                    } else {
                        var i = lookup_by_end[e[0]];
                        (regions[i] = regions[i] || [])[1] = e[2]
                    }
                })
                each(regions, function (r) {
                    r[1] = r[1] - r[0]
                })
            })

            return regions_for_node
        }
        
        var prev_regions_per_node = project_endpoints_to_LCAs(prev_endpoints, prev_merge_node, prev_nodes_on_path_to_LCAs)
        var leaf_regions_per_node = project_endpoints_to_LCAs(leaf_endpoints, leaf, leaf_nodes_on_path_to_LCAs)
        
        var prev_regions = prev_regions_per_node[prev_merge_node]
        var leaf_regions = leaf_regions_per_node[leaf]

        var prev_untouched_regions_for_LCA_by_position = {}
        var leaf_untouched_regions_for_LCA_by_position = {}

        each(LCAs, function (_, lca) {
            function process(base, regions, untouched, _by_position) {
                _by_position[lca] = {}
                var ri = 0
                var r
                each(untouched, function (u) {
                    while ((r = regions[ri]) && r[0] + r[1] <= u[2]) { ri++ }
                    while ((r = regions[ri]) && r[0] < u[2] + u[1]) {
                        _by_position[lca][r[0]] = ri
                        base[ri][2] = true
                        r[2] = true
                        ri++
                    }
                })
            }
            process(prev_regions_per_node[prev_merge_node], prev_regions_per_node[lca], prev_untouched_regions_for_node[lca], prev_untouched_regions_for_LCA_by_position)
            process(leaf_regions_per_node[leaf], leaf_regions_per_node[lca], leaf_untouched_regions_for_node[lca], leaf_untouched_regions_for_LCA_by_position)
        })

        function mark_deletes_and_more(regions_for_node, node, other_untouched_for_LCA_by_position) {
            each(regions_for_node[node], function (r, ri) {
                r[4] = r[5] = -1 // <-- the "more"
                if (r[2]) {
                    r[3] = -1
                    each(LCAs, function (_, lca) {
                        var rr = regions_for_node[lca][ri]
                        var other_ri = other_untouched_for_LCA_by_position[lca][rr[0]]
                        if (rr[2] && (typeof(other_ri) == 'number')) {
                            r[3] = other_ri
                            return false
                        }
                    })
                }
            })
        }
        mark_deletes_and_more(prev_regions_per_node, prev_merge_node, leaf_untouched_regions_for_LCA_by_position)
        mark_deletes_and_more(leaf_regions_per_node, leaf, prev_untouched_regions_for_LCA_by_position)

        function is_definitely_before(a_regions, a_node, ai, b_regions, b_node, bi) {
            var a_before_b = false
            var b_before_a = false
            each(LCAs, function (_, lca) {
                var ar = a_regions[lca][ai]
                var br = b_regions[lca][bi]
                
                if ((ar[1] || br[1]) && (ar[0] + ar[1] <= br[0]))
                    a_before_b = true
                if ((!ar[1] && !br[1]) && (ar[0] < br[0]))
                    a_before_b = true
                    
                if ((ar[1] || br[1]) && (br[0] + br[1] <= ar[0]))
                    b_before_a = true
                if ((!ar[1] && !br[1]) && (br[0] < ar[0]))
                    b_before_a = true
            })
            return a_before_b && !b_before_a
        }
        
        function calc_known_orderings(a_regions, a_node, b_regions, b_node) {
            var bi = 0
            each(a_regions[a_node], function (ar, ai) {
                for ( ; bi < b_regions[b_node].length; bi++) {
                    if (is_definitely_before(a_regions, a_node, ai, b_regions, b_node, bi)) {
                        ar[4] = bi
                        b_regions[b_node][bi][5] = ai
                        return
                    }
                }
            })
        }
        calc_known_orderings(prev_regions_per_node, prev_merge_node, leaf_regions_per_node, leaf)
        calc_known_orderings(leaf_regions_per_node, leaf, prev_regions_per_node, prev_merge_node)

        var m = custom_merge_func(s7, prev_merge_node, leaf, texts[prev_merge_node], texts[leaf], prev_regions, leaf_regions)
        
        var id = guid()
        var to_parents = {}
        s7.commits[prev_merge_node].from_kids[id] = to_parents[prev_merge_node] = m.to_a
        s7.commits[leaf].from_kids[id] = to_parents[leaf] = m.to_b
        s7.commits[id] = s7.temp_commits[id] = { to_parents : to_parents, from_kids : {} }
        
        prev_merge_node = id
        texts[prev_merge_node] = m.text
    }

    s7.leaf = prev_merge_node
    s7.text = texts[prev_merge_node]

    while (cursor_projection_node != s7.leaf) {
        var old_node = cursor_projection_node
        var kids = s7.commits[cursor_projection_node].from_kids
        var kid = Object.keys(kids)[0]
        var d = kids[kid]
        
        var offset = 0
        var poffset = 0
        each(d, function (d) {
            if (typeof(d) == 'number') {
                if (cursor_projection_offset <= poffset + d) {
                    cursor_projection_offset = cursor_projection_offset - poffset + offset
                    cursor_projection_node = kid
                    return false
                }
                offset += d
                poffset += d
            } else {
                if (cursor_projection_offset <= poffset + d[1].length) {
                    cursor_projection_offset = offset
                    cursor_projection_node = kid
                    return false
                }
                offset += d[0].length
                poffset += d[1].length
            }
        })
        if (cursor_projection_node == old_node) {
            cursor_projection_offset = offset
            cursor_projection_node = kid
        }
    }
    return cursor_projection_offset
}

function sync7_diff_merge_trans(a, b, a_factor, b_factor) {
    var ret = []
    var a_i = 0
    var b_i = 0
    var a_offset = 0
    var b_offset = 0
    var a_dumped_load = false
    var b_dumped_load = false
    function neg_idx(i) {
        return i == 0 ? 1 : 0
    }
    function a_idx(i) {
        return a_factor == -1 ? neg_idx(i) : i
    }
    function b_idx(i) {
        return b_factor == -1 ? neg_idx(i) : i
    }
    while (a_i < a.length && b_i < b.length) {
        var da = a[a_i]
        var db = b[b_i]
        if (typeof(da) == 'number' && typeof(db) == 'number') {
            var a_len = da - a_offset
            var b_len = db - b_offset
            sync7_push_eq(ret, Math.min(a_len, b_len))
        } else if (typeof(da) == 'number') {
            var a_len = da - a_offset
            var b_len = db[b_idx(0)].length - b_offset
            sync7_push_rep(ret, db[b_idx(0)].substr(b_offset, Math.min(a_len, b_len)), !b_dumped_load ? db[b_idx(1)] : '')
            b_dumped_load = true
        } else if (typeof(db) == 'number') {
            var a_len = da[a_idx(1)].length - a_offset
            var b_len = db - b_offset
            sync7_push_rep(ret, !a_dumped_load ? da[a_idx(0)] : '', da[a_idx(1)].substr(a_offset, Math.min(a_len, b_len)))
            a_dumped_load = true
        } else {
            var a_len = da[a_idx(1)].length - a_offset
            var b_len = db[b_idx(0)].length - b_offset
            sync7_push_rep(ret, !a_dumped_load ? da[a_idx(0)] : '', !b_dumped_load ? db[b_idx(1)] : '')
            a_dumped_load = b_dumped_load = true
        }
        if (a_len > b_len) {
            a_offset += b_len
        } else {
            a_i++
            a_offset = 0
            a_dumped_load = false
        }
        if (a_len < b_len) {
            b_offset += a_len
        } else {
            b_i++
            b_offset = 0
            b_dumped_load = false
        }
    }
    while (a_i < a.length) {
        var da = a[a_i]
        if (typeof(da) == 'number') {
            sync7_push_eq(ret, da)
        } else {
            sync7_push_rep(ret, !a_dumped_load ? da[a_idx(0)] : '', da[a_idx(1)].substr(a_offset))
        }
        a_i++
        a_offset = 0
        a_dumped_load = false
    }
    while (b_i < b.length) {
        var db = b[b_i]
        if (typeof(db) == 'number') {
            sync7_push_eq(ret, db)
        } else {
            sync7_push_rep(ret, db[b_idx(0)].substr(b_offset), !b_dumped_load ? db[b_idx(1)] : '')
        }
        b_i++
        b_offset = 0
        b_dumped_load = false
    }
    return ret
}

function sync7_merge_path_up(s7, from, path) {
    var diff = []
    var prev = from
    each(path, function (next) {
        diff = sync7_diff_merge_trans(diff, s7.commits[prev].to_parents[next])
        prev = next
    })
    return diff
}


function sync7_get_text(s7, id) {
    var ls = sync7_get_leaves(sync7_intersection(sync7_get_ancestors(s7, s7.leaf, true), sync7_get_ancestors(s7, id, true)))
    var lca = Object.keys(ls)[0]
    var leaf_to_lca = sync7_get_path_to_ancestor(s7, s7.leaf, lca)
    var lca_to_id = sync7_get_path_to_ancestor(s7, id, lca).reverse()
    if (lca_to_id.length > 0) {
        lca_to_id.shift()
        lca_to_id.push(id)
    }
    
    var diff = sync7_merge_path_up(s7, s7.leaf, leaf_to_lca)
    var prev = lca
    each(lca_to_id, function (next) {
        diff = sync7_diff_merge_trans(diff, s7.commits[next].to_parents[prev], 1, -1)
        prev = next
    })
    
    return sync7_diff_apply(s7.text, diff)
}
    
function sync7_get_leaves(commits, ignore) {
    if (!ignore) ignore = {}
    var leaves = {}
    each(commits, function (_, id) {
        if (ignore[id]) { return }
        leaves[id] = true
    })
    each(commits, function (c, id) {
        if (ignore[id]) { return }
        each(c.to_parents, function (_, p) {
            delete leaves[p]
        })
    })
    return leaves
}
    
function sync7_get_ancestors(s7, id, include_self) {
    var frontier = [id]
    var ancestors = {}
    if (include_self)
        ancestors[id] = s7.commits[id]
    while (frontier.length > 0) {
        var next = frontier.shift()
        each(s7.commits[next].to_parents, function (_, p) {
            if (!ancestors[p]) {
                ancestors[p] = s7.commits[p]
                frontier.push(p)
            }
        })
    }
    return ancestors
}

function sync7_get_path_to_ancestor(s7, a, b) {
    if (a == b) { return [] }
    var frontier = [a]
    var backs = {}
    while (frontier.length > 0) {
        var next = frontier.shift()
        if (next == b) {
            var path = []
            while (next && (next != a)) {
                path.unshift(next)
                next = backs[next]
            }
            return path
        }
        each(s7.commits[next].to_parents, function (_, p) {
            if (!backs[p]) {
                backs[p] = next
                frontier.push(p)
            }
        })
    }
    throw 'no path found from ' + a + ' to ' + b
}

function sync7_intersection(a, b) {
    var common = {}
    each(a, function (_, x) {
        if (b[x]) {
            common[x] = a[x]
        }
    })
    return common
}

function sync7_diff(a, b) {
    var ret = []
    var d = diff_main(a, b)
    for (var i = 0; i < d.length; i++) {
        var top = ret[ret.length - 1]
        if (d[i][0] == 0) {
            ret.push(d[i][1].length)
        } else if (d[i][0] == 1) {
            if (top && (typeof(top) != 'number'))
                top[1] += d[i][1]
            else
                ret.push(['', d[i][1]])
        } else {
            if (top && (typeof(top) != 'number'))
                top[0] += d[i][1]
            else
                ret.push([d[i][1], ''])
        }
    }
    return ret
}

function sync7_push_eq(diffs, size) {
    if (typeof(diffs[diffs.length - 1]) == 'number') {
        diffs[diffs.length - 1] += size
    } else diffs.push(size)
}

function sync7_push_rep(diffs, del, ins) {
    if (del.length == 0 && ins.length == 0) { return }
    if (diffs.length > 0) {
        var top = diffs[diffs.length - 1]
        if (typeof(top) != 'number') {
            top[0] += del
            top[1] += ins
            return
        }
    }
    diffs.push([del, ins])
}

function sync7_diff_apply(s, diff) {
    var offset = 0
    var texts = []
    each(diff, function (d) {
        if (typeof(d) == 'number') {
            texts.push(s.substr(offset, d))
            offset += d
        } else {
            texts.push(d[1])
            offset += d[0].length
        }
    })
    texts.push(s.substr(offset))
    return texts.join('')
}

function sync7_pretty_print(s7) {
    var output = []
    function helper(node, indent) {
        output.push('- '.repeat(indent) + node + ':' + sync7_get_text(s7, node))
        each(s7.commits[node].from_kids, function (_, kid) {
            if (s7.commits[kid])
                helper(kid, indent + 1)
        })
    }
    helper('root', 0)
    console.log(output.join('\n'))
}








function create_random_text() {
    var random_text = ''
    function add_char() {
        random_text += String.fromCharCode(97 + Math.floor(Math.random() * 26))
    }
    while (Math.random() < 0.5) add_char()
    return random_text
}

function create_random_ops() {
    var ops = []
    function add_random_ops() {
        if (Math.random() < 0.33) {
            ops.push({
                op : 'commit',
                side : Math.random() < 0.33 ? 'a' :
                    Math.random() < 0.5 ? 'b' : 'c',
                pos : Math.random(),
                del : Math.random(),
                text : create_random_text()
            })
        } else if (Math.random() < 0.5) {
            ops.push({
                op : 'merge',
                side : Math.random() < 0.33 ? 'a' :
                    Math.random() < 0.5 ? 'b' : 'c'
            })
        } else {
            ops.push({
                op : 'cursor',
                side : Math.random() < 0.33 ? 'a' :
                    Math.random() < 0.5 ? 'b' : 'c',
                pos : Math.random()
            })
        }
    }
    add_random_ops()
    while (Math.random() < 0.8) add_random_ops()
    return ops
}

function apply_ops_to_sync7(s7s, ops, debug_print_buffer) {
    if (!s7s.a.buffer) s7s.a.buffer = []
    if (!s7s.b.buffer) s7s.b.buffer = []
    if (!s7s.c.buffer) s7s.c.buffer = []
    if (typeof(s7s.a.cursor) != 'number') s7s.a.cursor = 0
    if (typeof(s7s.b.cursor) != 'number') s7s.b.cursor = 0
    if (typeof(s7s.c.cursor) != 'number') s7s.c.cursor = 0
    each(ops, function (op, opi) {
        var s7 = s7s[op.side]
        var other_s7s = []
        each(s7s, function (s7, key) {
            if (key != op.side)
                other_s7s.push(s7)
        })
        if (op.op == 'commit') {
            var t = s7.text
            var pos = Math.floor((t.length + 1) * op.pos)
            var del = Math.floor((t.length - pos) * op.del)
            var msg = sync7_commit(s7, t.slice(0, pos) + op.text + t.slice(pos + del))
            if (!msg) msg = null
            each(other_s7s, function (s7) {
                s7.buffer.push(JSON.parse(JSON.stringify(msg)))
            })
            
            if (s7.cursor > s7.text.length) {
                s7.cursor = s7.text.length
            }
            
            if (debug_print_buffer) {
                debug_print_buffer.push('OP COMMIT')
                debug_print_buffer.push('side: ' + op.side)
                debug_print_buffer.push('pos: ' + pos)
                debug_print_buffer.push('del: ' + del)
                debug_print_buffer.push('txt: ' + op.text)
            }
            
        } else if (op.op == 'merge') {
            var x = s7.buffer.shift()
            if (x) {
                s7.cursor = sync7_merge(s7, x, my_custom_merge_func, s7.cursor)
            }

            if (debug_print_buffer) {
                debug_print_buffer.push('OP MERGE')
                debug_print_buffer.push('side: ' + op.side)
            }
        } else if (op.op == 'cursor') {
            s7.cursor = Math.floor((s7.text.length + 1) * op.pos)
            
            if (debug_print_buffer) {
                debug_print_buffer.push('OP CURSOR')
                debug_print_buffer.push('side: ' + op.side)
                debug_print_buffer.push('pos: ' + s7.cursor)
            }
        }
    })
}

function apply_ops_to_diffsync(dss, ops, debug_print_buffer) {
    function map_array(a, f) {
        var b = []
        each(a, function (v, k) { b[k] = f(v) })
        return b
    }    
    function adjust_range(range, patch) {
        return map_array(range, function (x) {
            each(patch, function (p) {
                if (p[0] < x) {
                    if (p[0] + p[1] <= x) {
                        x += -p[1] + p[2].length
                    } else {
                        x = p[0] + p[2].length
                    }
                } else return false
            })
            return x
        })
    }

    if (!dss.a.buffer) dss.a.buffer = []
    if (!dss.b.buffer) dss.b.buffer = []
    if (!dss.c.buffer) dss.c.buffer = []
    if (typeof(dss.a.cursor) != 'number') dss.a.cursor = 0
    if (typeof(dss.b.cursor) != 'number') dss.b.cursor = 0
    if (typeof(dss.c.cursor) != 'number') dss.c.cursor = 0
    each(ops, function (op) {
        var ds = dss[op.side]
        var others = []
        each(dss, function (ds, key) {
            if (key != op.side)
                others.push(ds)
        })
        if (op.op == 'commit') {
            var t = ds.cache
            var pos = Math.floor((t.length + 1) * op.pos)
            var del = Math.floor((t.length - pos) * op.del)
            var msg = ds.commit(t.slice(0, pos) + op.text + t.slice(pos + del))
            if (!msg) msg = null
            each(others, function (ds) {
                ds.buffer.push(JSON.parse(JSON.stringify(msg)))
            })
            
            if (ds.cursor > ds.cache.length) {
                ds.cursor = ds.cache.length
            }
            
        } else if (op.op == 'merge') {
            var x = ds.buffer.shift()
            if (x) {
                var old = ds.cache
                
                ds.merge(x)
                
                var patch = get_diff_patch(old, ds.cache)
                var range = [ds.cursor]
                range = adjust_range(range, patch)
                ds.cursor = range[0]
            }
        } else if (op.op == 'cursor') {
            ds.cursor = Math.floor((ds.cache.length + 1) * op.pos)
        }
    })
}

function apply_ops_to_test_repos(ops, debug_print_buffer) {
    var test_repos = {
        sync7 : {
            a : create_sync7_repo(),
            b : create_sync7_repo(),
            c : create_sync7_repo(),
        },
        diffsync : {
            a : diffsync.create_minigit(),
            b : diffsync.create_minigit(),
            c : diffsync.create_minigit(),
        },
    }
    
    apply_ops_to_sync7(test_repos.sync7, ops, debug_print_buffer)

    apply_ops_to_diffsync(test_repos.diffsync, ops, debug_print_buffer)

    test_repos.same = (test_repos.sync7.a.text == test_repos.diffsync.a.cache) && (test_repos.sync7.b.text == test_repos.diffsync.b.cache) && (test_repos.sync7.c.text == test_repos.diffsync.c.cache) && (test_repos.sync7.a.cursor == test_repos.diffsync.a.cursor) && (test_repos.sync7.b.cursor == test_repos.diffsync.b.cursor) && (test_repos.sync7.c.cursor == test_repos.diffsync.c.cursor)
    return test_repos
}

Math.randomSeed(133)

for (var tests = 0; tests < 100; tests++) {
    var ops = create_random_ops()
    var good = false
    
    
    
    
    
    for (var i = 0; i < 100; i++) {
        
        
        if (tests == 84 && i == 99) {
            debugger
        }
        
        
        var res = apply_ops_to_test_repos(ops)
        if (res.same) {
            good = true
            break
        }
    }
    
    
    
    
    
    var print_stuff = ['TEST NUM ' + tests]
    if (!good) {
        print_stuff.push('BLOOP:')
        //console.log('ops: ' + JSON.stringify(ops, null, '  '))
        apply_ops_to_test_repos(ops, print_stuff)
        print_stuff.push('As7: ' + res.sync7.a.text)
        print_stuff.push('Adi: ' + res.diffsync.a.cache)
        print_stuff.push('Bs7: ' + res.sync7.b.text)
        print_stuff.push('Bdi: ' + res.diffsync.b.cache)
        print_stuff.push('Cs7: ' + res.sync7.c.text)
        print_stuff.push('Cdi: ' + res.diffsync.c.cache)
        print_stuff.push('As7c: ' + res.sync7.a.cursor)
        print_stuff.push('Adic: ' + res.diffsync.a.cursor)
        print_stuff.push('Bs7c: ' + res.sync7.b.cursor)
        print_stuff.push('Bdic: ' + res.diffsync.b.cursor)
        print_stuff.push('Cs7c: ' + res.sync7.c.cursor)
        print_stuff.push('Cdic: ' + res.diffsync.c.cursor)
        console.log(print_stuff.join('\n'))
        throw 'stop7'
    } else {
        print_stuff.push('BLAR! ' + ops.length + ' i=' + i)
        print_stuff.push('a: ' + res.sync7.a.text + ' == ' + res.diffsync.a.cache)
        print_stuff.push('b: ' + res.sync7.b.text + ' == ' + res.diffsync.b.cache)
        print_stuff.push('c: ' + res.sync7.c.text + ' == ' + res.diffsync.c.cache)
        print_stuff.push('a: ' + res.sync7.a.cursor + ' == ' + res.diffsync.a.cursor)
        print_stuff.push('b: ' + res.sync7.b.cursor + ' == ' + res.diffsync.b.cursor)
        print_stuff.push('c: ' + res.sync7.c.cursor + ' == ' + res.diffsync.c.cursor)
    }
    console.log(print_stuff.join('\n'))
}

</script>
