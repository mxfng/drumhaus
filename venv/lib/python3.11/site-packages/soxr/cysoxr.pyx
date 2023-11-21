#cython: language_level=3

# Cython wrapper for libsoxr
# https://github.com/dofuuz/python-soxr

cimport cython
import numpy as np
cimport numpy as np

from . cimport csoxr


QQ = csoxr.SOXR_QQ
LQ = csoxr.SOXR_LQ
MQ = csoxr.SOXR_MQ
HQ = csoxr.SOXR_HQ
VHQ = csoxr.SOXR_VHQ


ctypedef fused datatype_t:
    cython.float
    cython.double
    cython.int
    cython.short


cpdef str libsoxr_version():
    return csoxr.libsoxr_version().decode('UTF-8')


# NumPy scalar type to soxr_io_spec_t
cdef csoxr.soxr_io_spec_t to_io_spec(type ntype):
    cdef csoxr.soxr_datatype_t io_type
    if ntype == np.float32:
        io_type = csoxr.SOXR_FLOAT32_I
    elif ntype == np.float64:
        io_type = csoxr.SOXR_FLOAT64_I
    elif ntype == np.int32:
        io_type = csoxr.SOXR_INT32_I
    elif ntype == np.int16:
        io_type = csoxr.SOXR_INT16_I
    else:
        raise ValueError('Data type not support')

    return csoxr.soxr_io_spec(io_type, io_type)


cdef class CySoxr:
    cdef csoxr.soxr_t _soxr
    cdef double _in_rate
    cdef double _out_rate
    cdef type _ntype
    cdef unsigned _channels
    cdef bint _ended

    def __cinit__(self,
                  double in_rate, double out_rate, unsigned num_channels,
                  type ntype, unsigned long quality):
        self._in_rate = in_rate
        self._out_rate = out_rate
        self._ntype = ntype
        self._channels = num_channels
        self._ended = False

        cdef csoxr.soxr_error_t err = NULL
        cdef csoxr.soxr_io_spec_t io_spec = to_io_spec(ntype)
        cdef csoxr.soxr_quality_spec_t quality_spec = csoxr.soxr_quality_spec(quality, 0)

        self._soxr = csoxr.soxr_create(
            in_rate, out_rate, num_channels,
            &err, &io_spec, &quality_spec, NULL)

        if err is not NULL:
            raise RuntimeError(err)

    def __dealloc__(self):
        csoxr.soxr_delete(self._soxr)

    @cython.boundscheck(False)
    @cython.wraparound(False)
    cpdef np.ndarray process(self, const datatype_t[:, ::1] x, bint last=False):
        cdef size_t ilen = x.shape[0]
        cdef size_t olen = np.ceil(ilen * self._out_rate / self._in_rate)
        cdef unsigned channels = x.shape[1]

        if self._ended:
            raise RuntimeError('Input after last input')

        if channels != self._channels:
            raise ValueError('Channel num mismatch')

        cdef type ntype
        if datatype_t is cython.float:
            ntype = np.float32
        elif datatype_t is cython.double:
            ntype = np.float64
        elif datatype_t is cython.int:
            ntype = np.int32
        elif datatype_t is cython.short:
            ntype = np.int16

        if ntype != self._ntype:
            raise ValueError('Data type mismatch')

        cdef np.ndarray y = np.zeros([olen, channels], dtype=ntype, order='c')

        cdef size_t odone
        csoxr.soxr_process(
            self._soxr,
            &x[0,0], ilen, NULL,
            y.data, olen, &odone)

        y = y[:odone]

        # flush if last input
        cdef np.ndarray last_buf
        cdef int delay
        if last:
            self._ended = True
            delay = int(csoxr.soxr_delay(self._soxr) + .5)

            if 0 < delay:
                last_buf = np.zeros([delay, channels], dtype=ntype, order='c')

                csoxr.soxr_process(
                    self._soxr,
                    NULL, 0, NULL,
                    last_buf.data, delay, &odone)

                last_buf = last_buf[:odone]

                y = np.concatenate([y, last_buf])

        return y


@cython.boundscheck(False)
@cython.wraparound(False)
cpdef np.ndarray cysoxr_divide_proc(double in_rate, double out_rate,
                                    const datatype_t[:, ::1] x,
                                    unsigned long quality):
    cdef size_t ilen = x.shape[0]
    cdef size_t olen = np.ceil(ilen * out_rate / in_rate)
    cdef size_t chunk_len = int(48000 * in_rate / out_rate)
    cdef unsigned channels = x.shape[1]

    cdef type ntype
    if datatype_t is cython.float:
        ntype = np.float32
    elif datatype_t is cython.double:
        ntype = np.float64
    elif datatype_t is cython.int:
        ntype = np.int32
    elif datatype_t is cython.short:
        ntype = np.int16

    # init soxr
    cdef csoxr.soxr_error_t err = NULL
    cdef csoxr.soxr_io_spec_t io_spec = to_io_spec(ntype)
    cdef csoxr.soxr_quality_spec_t quality_spec = csoxr.soxr_quality_spec(quality, 0)

    cdef csoxr.soxr_t soxr = csoxr.soxr_create(
        in_rate, out_rate, channels,
        &err, &io_spec, &quality_spec, NULL)

    if err is not NULL:
        raise RuntimeError(err)

    # alloc
    cdef np.ndarray y = np.zeros([olen, channels], dtype=ntype, order='c')
    cdef datatype_t[:, ::1] y_view = y

    # divide and process
    cdef size_t odone
    cdef size_t out_pos = 0
    cdef size_t idx = 0
    with nogil:
        while idx + chunk_len < ilen:
            csoxr.soxr_process(
                soxr,
                &x[idx,0], chunk_len, NULL,
                &y_view[out_pos,0], olen-out_pos, &odone)
            out_pos += odone
            idx += chunk_len

        # last chunk
        if idx < ilen:
            csoxr.soxr_process(
                soxr,
                &x[idx,0], ilen-idx, NULL,
                &y_view[out_pos,0], olen-out_pos, &odone)
            out_pos += odone

        # flush
        if out_pos < olen:
            csoxr.soxr_process(
                soxr,
                NULL, 0, NULL,
                &y_view[out_pos,0], olen-out_pos, &odone)
            out_pos += odone

        # destruct
        csoxr.soxr_delete(soxr)

    return y[:out_pos]


cpdef np.ndarray cysoxr_oneshot(double in_rate, double out_rate,
                                np.ndarray x,
                                unsigned long quality):
    if 2 < x.ndim:
        raise ValueError('Input must be 1-D or 2-D array')

    cdef size_t ilen = x.shape[0]
    cdef size_t olen = np.ceil(ilen * out_rate / in_rate)
    cdef unsigned channels = 1
    if 2 == x.ndim:
        channels = x.shape[1]

    cdef type ntype = x.dtype.type

    # make soxr config
    cdef csoxr.soxr_error_t err = NULL
    cdef csoxr.soxr_io_spec_t io_spec = to_io_spec(ntype)
    cdef csoxr.soxr_quality_spec_t quality_spec = csoxr.soxr_quality_spec(quality, 0)

    x = np.ascontiguousarray(x)    # make array C-contiguous

    cdef size_t odone
    cdef np.ndarray y
    if 1 == x.ndim:
        y = np.zeros([olen], dtype=ntype, order='c')
    else:
        y = np.zeros([olen, channels], dtype=ntype, order='c')

    err = csoxr.soxr_oneshot(
        in_rate, out_rate, channels,
        x.data, ilen, NULL,
        y.data, olen, &odone,
        &io_spec, &quality_spec, NULL)

    if err is not NULL:
        raise RuntimeError(err)

    return y[:odone]
